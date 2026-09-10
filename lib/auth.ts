import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { getEmailSender } from "@/lib/email/sender";
import { getEmailFrom, getAppBaseUrl } from "@/lib/email/config";
import { renderVerificationEmail } from "@/lib/email/templates/verification-email";
import { renderResetPasswordEmail } from "@/lib/email/templates/reset-password-email";
import { linkGuestAppointmentsToVerifiedUser } from "@/lib/link-guest-appointments";
import { postgresRateLimitStorage } from "@/lib/auth-rate-limit-storage";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email + password authentication
  emailAndPassword: {
    enabled: true,
    // Block sign-in until email is verified
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Revoke all sessions when password is reset (security requirement)
    revokeSessionsOnPasswordReset: true,
    // Do not automatically sign in after signup — user must verify first
    autoSignIn: false,

    /**
     * Send password-reset email.
     * SECURITY: The url already contains the reset token supplied by Better Auth.
     * We must NOT log the url or token, and must NOT persist them in application tables.
     */
    sendResetPassword: async (data) => {
      const sender = getEmailSender();
      const template = renderResetPasswordEmail({
        userName: data.user.name,
        resetUrl: data.url,
      });
      await sender.send({
        to: data.user.email,
        from: getEmailFrom(),
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    },

    /**
     * Provide a customSyntheticUser so that duplicate-email signups return a
     * response indistinguishable from a real signup (enumeration protection).
     * The additional `role` and `phone` fields must be included.
     */
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "CUSTOMER",
      phone: null,
      ...additionalFields,
      id,
    }),
  },

  // Email verification lifecycle
  emailVerification: {
    // Always send verification email immediately on signup
    sendOnSignUp: true,
    // Do NOT auto-sign-in after verification — user clicks link → success page → login
    autoSignInAfterVerification: false,
    // Token expires in 1 hour
    expiresIn: 60 * 60,

    /**
     * Send verification email.
     * SECURITY: url contains the token supplied by Better Auth.
     * We must NOT log the url/token or persist them in any application table.
     * We build the link from getAppBaseUrl() (trusted env var) rather than
     * from any incoming request header.
     */
    sendVerificationEmail: async (data) => {
      const sender = getEmailSender();
      const template = renderVerificationEmail({
        userName: data.user.name,
        verificationUrl: data.url,
      });
      await sender.send({
        to: data.user.email,
        from: getEmailFrom(),
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    },

    /**
     * After email is verified:
     * - Link any unowned guest appointments matching the verified email.
     * This is the canonical, safe trigger point: email ownership is confirmed
     * by Better Auth before this hook is called.
     * NEVER runs for unverified emails.
     */
    afterEmailVerification: async (user) => {
      if (user.emailVerified && user.email) {
        await linkGuestAppointmentsToVerifiedUser(user.id, user.email).catch(
          () => {
            // Non-fatal: linking will be retried on account page load
          },
        );
      }
    },
  },

  // User additional fields
  user: {
    additionalFields: {
      role: {
        type: ["CUSTOMER", "STAFF", "ADMIN"],
        required: false,
        defaultValue: "CUSTOMER",
        // Prevent clients from setting role at signup
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },

  // Durable PostgreSQL rate limiting — replaces process-local middleware Map
  rateLimit: {
    enabled: true,
    // Apply rate limiting in all environments (better-auth defaults to production only)
    // Our PostgreSQL storage is always available
    customStorage: postgresRateLimitStorage,
    // Default: 100 req/10s per route. Fine-tune per path as needed.
    window: 10,
    max: 100,
    customRules: {
      // Tighter limits for sensitive auth endpoints in production; relaxed for CI/test suites
      "/sign-up/email": {
        window: 60 * 60,
        max: process.env.NODE_ENV === "production" && !process.env.CI ? 10 : 1000,
      },
      "/sign-in/email": {
        window: 60,
        max: process.env.NODE_ENV === "production" && !process.env.CI ? 10 : 1000,
      },
      "/send-verification-email": {
        window: 60 * 10,
        max: process.env.NODE_ENV === "production" && !process.env.CI ? 5 : 1000,
      },
      "/forget-password": {
        window: 60 * 10,
        max: process.env.NODE_ENV === "production" && !process.env.CI ? 5 : 1000,
      },
      "/reset-password": {
        window: 60 * 10,
        max: process.env.NODE_ENV === "production" && !process.env.CI ? 5 : 1000,
      },
    },
  },

  // Trusted base URL for constructing verification/reset links
  baseURL: getAppBaseUrl(),

  plugins: [nextCookies()],
});
