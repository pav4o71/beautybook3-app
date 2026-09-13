import "dotenv/config";
import assert from "node:assert/strict";
import { auth } from "../../lib/auth";
import {
  AUTH_EMAIL_DELIVERY_ERROR_MESSAGE,
} from "../../lib/email/auth-email";
import { MemoryEmailSender } from "../../lib/email/memory-sender";
import { setTestEmailSender } from "../../lib/email/sender";
import type {
  EmailSender,
  SendEmailPayload,
  SendEmailResult,
} from "../../lib/email/types";
import { prisma } from "../../lib/prisma";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";

assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);

const GENERIC_RESET_MESSAGE =
  "If this email exists in our system, check your email for the reset link";

class RecordingFailureSender implements EmailSender {
  readonly providerName = "recording-failure";
  readonly providerError = "private provider diagnostic";
  payload: SendEmailPayload | null = null;
  sendCount = 0;

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    this.payload = { ...payload };
    this.sendCount += 1;
    return { success: false, error: this.providerError };
  }
}

class ThrowingSender implements EmailSender {
  readonly providerName = "throwing";
  readonly providerError = "private thrown provider diagnostic";
  payload: SendEmailPayload | null = null;

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    this.payload = { ...payload };
    throw new Error(this.providerError);
  }
}

type AuthResponse = {
  status: number;
  bodyText: string;
  body: unknown;
};

function authOrigin() {
  const configured =
    process.env.BETTER_AUTH_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3000";
  return new URL(configured).origin;
}

async function postAuth(path: string, body: Record<string, unknown>) {
  const origin = authOrigin();
  const response = await auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify(body),
    }),
  );
  const bodyText = await response.text();
  let parsed: unknown = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }
  }
  return { status: response.status, bodyText, body: parsed } satisfies AuthResponse;
}

function logArgument(value: unknown): string {
  if (value instanceof Error) {
    return `${value.message}\n${value.stack ?? ""}`;
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value) ?? String(value);
}

async function captureConsole<T>(operation: () => Promise<T>) {
  const captured: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => {
    captured.push(args.map(logArgument).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    captured.push(args.map(logArgument).join(" "));
  };

  try {
    return { value: await operation(), logs: captured };
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

function emailUrl(payload: SendEmailPayload | null) {
  assert(payload, "Expected the auth callback to invoke the email sender");
  const match = payload.text.match(/https?:\/\/\S+/);
  assert(match, "Expected the auth email text to contain its bearer URL");
  return new URL(match[0]);
}

function verificationToken(payload: SendEmailPayload | null) {
  const token = emailUrl(payload).searchParams.get("token");
  assert(token, "Expected a verification token in the auth email URL");
  return token;
}

function resetToken(payload: SendEmailPayload | null) {
  const token = emailUrl(payload).pathname.split("/").at(-1);
  assert(token, "Expected a reset token in the auth email URL");
  return token;
}

function assertNotObservable(
  response: AuthResponse,
  logs: string[],
  forbiddenValues: string[],
) {
  for (const value of forbiddenValues) {
    assert(!response.bodyText.includes(value), "Sensitive auth delivery data reached the public response");
    assert(!logs.some((entry) => entry.includes(value)), "Sensitive auth delivery data reached logs");
  }
}

async function assertNotInBeautyBookRecords(token: string) {
  const rows = await prisma.$queryRaw<Array<{ found: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT row_to_json(record)::text AS data FROM "Organization" record
        UNION ALL SELECT row_to_json(record)::text FROM "OrganizationMember" record
        UNION ALL SELECT row_to_json(record)::text FROM "Location" record
        UNION ALL SELECT row_to_json(record)::text FROM "Staff" record
        UNION ALL SELECT row_to_json(record)::text FROM "ServiceCategory" record
        UNION ALL SELECT row_to_json(record)::text FROM "Service" record
        UNION ALL SELECT row_to_json(record)::text FROM "StaffService" record
        UNION ALL SELECT row_to_json(record)::text FROM "StaffSchedule" record
        UNION ALL SELECT row_to_json(record)::text FROM "TimeOff" record
        UNION ALL SELECT row_to_json(record)::text FROM "Appointment" record
        UNION ALL SELECT row_to_json(record)::text FROM "AppointmentService" record
        UNION ALL SELECT row_to_json(record)::text FROM "NotificationDelivery" record
        UNION ALL SELECT row_to_json(record)::text FROM "RateLimitBucket" record
      ) beautybook_records
      WHERE strpos(data, ${token}) > 0
    ) AS found
  `;
  assert.equal(rows[0]?.found, false, "Auth bearer token reached a BeautyBook domain record");
}

function assertGenericResetResponse(response: AuthResponse) {
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: true,
    message: GENERIC_RESET_MESSAGE,
  });
}

async function main() {
  const testEmail = `bb-p1-02-${Date.now()}@example.com`;
  const unknownEmail = `unknown-${testEmail}`;
  const password = "AuthDelivery123!";
  let userId: string | null = null;
  const notificationCountBefore = await prisma.notificationDelivery.count();

  try {
    const successSender = new MemoryEmailSender();
    setTestEmailSender(successSender);

    const signup = await postAuth("/sign-up/email", {
      name: "Auth Delivery Test",
      email: testEmail,
      password,
      callbackURL: "/verify-email/confirm",
    });
    assert.equal(signup.status, 200);
    assert.equal(
      successSender.sentEmails.length,
      0,
      "Signup must defer delivery to the explicit client-visible resend request",
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testEmail },
      select: { id: true, emailVerified: true },
    });
    userId = user.id;
    assert.equal(user.emailVerified, false);

    const verificationSuccess = await postAuth("/send-verification-email", {
      email: testEmail,
      callbackURL: "/verify-email/confirm",
    });
    assert.equal(verificationSuccess.status, 200);
    assert.deepEqual(verificationSuccess.body, { status: true });
    assert.equal(successSender.sentEmails.length, 1);
    await assertNotInBeautyBookRecords(
      verificationToken(successSender.sentEmails[0] ?? null),
    );

    const verificationFailureSender = new RecordingFailureSender();
    setTestEmailSender(verificationFailureSender);
    const verificationFailure = await captureConsole(() =>
      postAuth("/send-verification-email", {
        email: testEmail,
        callbackURL: "/verify-email/confirm",
      }),
    );
    assert.equal(verificationFailure.value.status, 500);
    const failedVerificationToken = verificationToken(
      verificationFailureSender.payload,
    );
    assertNotObservable(verificationFailure.value, verificationFailure.logs, [
      verificationFailureSender.providerError,
      failedVerificationToken,
    ]);
    assert(
      verificationFailure.logs.some((entry) =>
        entry.includes(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE),
      ),
      "Verification failure must remain internally observable as a sanitized error",
    );
    await assertNotInBeautyBookRecords(failedVerificationToken);

    const throwingSender = new ThrowingSender();
    setTestEmailSender(throwingSender);
    const verificationThrow = await captureConsole(() =>
      postAuth("/send-verification-email", {
        email: testEmail,
        callbackURL: "/verify-email/confirm",
      }),
    );
    assert.equal(verificationThrow.value.status, 500);
    const thrownVerificationToken = verificationToken(throwingSender.payload);
    assertNotObservable(verificationThrow.value, verificationThrow.logs, [
      throwingSender.providerError,
      thrownVerificationToken,
    ]);
    assert(
      verificationThrow.logs.some((entry) =>
        entry.includes(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE),
      ),
      "Thrown verification failure must use the sanitized contract",
    );
    await assertNotInBeautyBookRecords(thrownVerificationToken);

    successSender.clear();
    setTestEmailSender(successSender);
    const resetSuccess = await postAuth("/request-password-reset", {
      email: testEmail,
      redirectTo: "/reset-password",
    });
    assertGenericResetResponse(resetSuccess);
    assert.equal(successSender.sentEmails.length, 1);
    await assertNotInBeautyBookRecords(
      resetToken(successSender.sentEmails[0] ?? null),
    );

    const resetFailureSender = new RecordingFailureSender();
    setTestEmailSender(resetFailureSender);
    const resetComparison = await captureConsole(async () => {
      const knownFailure = await postAuth("/request-password-reset", {
        email: testEmail,
        redirectTo: "/reset-password",
      });
      const sendsAfterKnownFailure = resetFailureSender.sendCount;
      const unknown = await postAuth("/request-password-reset", {
        email: unknownEmail,
        redirectTo: "/reset-password",
      });
      return { knownFailure, sendsAfterKnownFailure, unknown };
    });

    const { knownFailure, sendsAfterKnownFailure, unknown } = resetComparison.value;
    assertGenericResetResponse(knownFailure);
    assertGenericResetResponse(unknown);
    assert.equal(sendsAfterKnownFailure, 1);
    assert.equal(
      resetFailureSender.sendCount,
      sendsAfterKnownFailure,
      "Unknown reset email must not invoke the sender",
    );
    assert.equal(knownFailure.status, unknown.status);
    assert.equal(knownFailure.bodyText, unknown.bodyText);

    const failedResetToken = resetToken(resetFailureSender.payload);
    assertNotObservable(knownFailure, resetComparison.logs, [
      resetFailureSender.providerError,
      failedResetToken,
    ]);
    assert(
      resetComparison.logs.some((entry) =>
        entry.includes(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE),
      ),
      "Reset delivery failure must remain internally observable as a sanitized error",
    );
    await assertNotInBeautyBookRecords(failedResetToken);

    assert.equal(
      await prisma.notificationDelivery.count(),
      notificationCountBefore,
      "Auth email handling must not create NotificationDelivery rows",
    );

    console.log("verify-auth-email-delivery: ok", {
      verificationSuccess: verificationSuccess.status,
      verificationFailure: verificationFailure.value.status,
      verificationThrow: verificationThrow.value.status,
      resetSuccess: resetSuccess.status,
      resetFailure: knownFailure.status,
      unknownReset: unknown.status,
      publicResetResponsesEqual: true,
      tokenHygiene: true,
    });
  } finally {
    setTestEmailSender(null);
    if (userId) {
      await prisma.verification.deleteMany({ where: { value: userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("verify-auth-email-delivery failed:", error);
  process.exit(1);
});
