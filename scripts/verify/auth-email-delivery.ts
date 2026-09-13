import "dotenv/config";
import assert from "node:assert/strict";
import { auth } from "../../lib/auth";
import {
  AUTH_EMAIL_DELIVERY_ERROR_MESSAGE,
  setTestAuthEmailScheduler,
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
const LIVENESS_GUARD_MS = 10_000;

class ImmediateBackgroundScheduler {
  private tasks: Promise<void>[] = [];
  scheduledCount = 0;

  readonly schedule = (task: () => Promise<void>): void => {
    this.scheduledCount += 1;
    const pending = task();
    // Attach a handler immediately so even a regression cannot create an
    // unhandled rejection before drain() reports it deterministically.
    pending.catch(() => {});
    this.tasks.push(pending);
  };

  async drain(): Promise<void> {
    const tasks = this.tasks.splice(0);
    const results = await Promise.allSettled(tasks);
    for (const result of results) {
      assert.equal(
        result.status,
        "fulfilled",
        "An auth background task rejected instead of consuming its failure",
      );
    }
  }
}

class DeferredEmailSender implements EmailSender {
  readonly providerName = "deferred";
  payload: SendEmailPayload | null = null;
  sendCount = 0;
  released = false;
  settled = false;

  private signalStarted!: () => void;
  private signalRelease!: () => void;
  readonly started = new Promise<void>((resolve) => {
    this.signalStarted = resolve;
  });
  private readonly releaseSignal = new Promise<void>((resolve) => {
    this.signalRelease = resolve;
  });

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    this.payload = { ...payload };
    this.sendCount += 1;
    this.signalStarted();
    await this.releaseSignal;
    this.settled = true;
    return { success: true, messageId: "deferred-success" };
  }

  release(): void {
    if (!this.released) {
      this.released = true;
      this.signalRelease();
    }
  }
}

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

async function withLivenessGuard<T>(
  promise: Promise<T>,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), LIVENESS_GUARD_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function expectResponseBeforeProviderRelease(
  request: Promise<AuthResponse>,
  sender: DeferredEmailSender,
): Promise<AuthResponse> {
  await withLivenessGuard(
    sender.started,
    "The expected auth email background task did not start",
  );

  try {
    const response = await withLivenessGuard(
      request,
      "The public auth response waited for the deferred email provider",
    );
    assert.equal(sender.released, false);
    assert.equal(sender.settled, false);
    return response;
  } catch (error) {
    sender.release();
    await request.catch(() => {});
    throw error;
  }
}

function emailUrl(payload: SendEmailPayload | null) {
  assert(payload, "Expected the auth background task to invoke the email sender");
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
    assert(
      !response.bodyText.includes(value),
      "Sensitive auth delivery data reached the public response",
    );
    assert(
      !logs.some((entry) => entry.includes(value)),
      "Sensitive auth delivery data reached logs",
    );
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
  assert.equal(
    rows[0]?.found,
    false,
    "Auth bearer token reached a BeautyBook domain record",
  );
}

function assertGenericResetResponse(response: AuthResponse) {
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: true,
    message: GENERIC_RESET_MESSAGE,
  });
}

function signupPublicSemantics(response: AuthResponse) {
  assert.equal(response.status, 200);
  assert(response.body && typeof response.body === "object");
  const body = response.body as {
    token?: unknown;
    user?: Record<string, unknown>;
  };
  assert(body.user && typeof body.user === "object");
  return {
    status: response.status,
    token: body.token,
    user: {
      name: body.user.name,
      email: body.user.email,
      emailVerified: body.user.emailVerified,
      image: body.user.image,
      role: body.user.role,
      phone: body.user.phone,
    },
  };
}

async function main() {
  const testEmail = `bb-p1-02-${Date.now()}@example.com`;
  const unknownEmail = `unknown-${testEmail}`;
  const password = "AuthDelivery123!";
  let userId: string | null = null;
  const notificationCountBefore = await prisma.notificationDelivery.count();
  const scheduler = new ImmediateBackgroundScheduler();

  setTestAuthEmailScheduler(scheduler.schedule);

  try {
    // New signup schedules one verification delivery and returns before the
    // provider. Duplicate signup paths skip delivery but expose the same public
    // success semantics for both unverified and verified existing accounts.
    const signupSender = new DeferredEmailSender();
    setTestEmailSender(signupSender);
    const newSignupRequest = postAuth("/sign-up/email", {
      name: "Auth Delivery Test",
      email: testEmail,
      password,
      callbackURL: "/verify-email/confirm",
    });
    const newSignup = await expectResponseBeforeProviderRelease(
      newSignupRequest,
      signupSender,
    );
    const newSignupSemantics = signupPublicSemantics(newSignup);
    assert.equal(signupSender.sendCount, 1);
    const signupVerificationToken = verificationToken(signupSender.payload);
    signupSender.release();
    await scheduler.drain();
    await assertNotInBeautyBookRecords(signupVerificationToken);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testEmail },
      select: { id: true, emailVerified: true },
    });
    userId = user.id;
    assert.equal(user.emailVerified, false);

    const duplicateSender = new MemoryEmailSender();
    setTestEmailSender(duplicateSender);
    const scheduledBeforeDuplicates = scheduler.scheduledCount;
    const duplicateUnverified = await postAuth("/sign-up/email", {
      name: "Auth Delivery Test",
      email: testEmail,
      password,
      callbackURL: "/verify-email/confirm",
    });
    assert.deepEqual(
      signupPublicSemantics(duplicateUnverified),
      newSignupSemantics,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    const duplicateVerified = await postAuth("/sign-up/email", {
      name: "Auth Delivery Test",
      email: testEmail,
      password,
      callbackURL: "/verify-email/confirm",
    });
    assert.deepEqual(signupPublicSemantics(duplicateVerified), newSignupSemantics);
    assert.equal(
      scheduler.scheduledCount,
      scheduledBeforeDuplicates,
      "Duplicate signup must not schedule a follow-up verification send",
    );
    assert.equal(duplicateSender.sentEmails.length, 0);

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: false },
    });

    // Unauthenticated resend is public for all three account states. Better
    // Auth normalizes each to the same response; the unverified path additionally
    // proves that provider latency is outside the response critical path.
    const verificationSender = new DeferredEmailSender();
    setTestEmailSender(verificationSender);
    const verificationRequest = postAuth("/send-verification-email", {
      email: testEmail,
      callbackURL: "/verify-email/confirm",
    });
    const verificationSuccess = await expectResponseBeforeProviderRelease(
      verificationRequest,
      verificationSender,
    );
    assert.equal(verificationSuccess.status, 200);
    assert.deepEqual(verificationSuccess.body, { status: true });
    const verificationSuccessToken = verificationToken(
      verificationSender.payload,
    );
    verificationSender.release();
    await scheduler.drain();
    await assertNotInBeautyBookRecords(verificationSuccessToken);

    const resendComparisonSender = new MemoryEmailSender();
    setTestEmailSender(resendComparisonSender);
    const unknownResend = await postAuth("/send-verification-email", {
      email: unknownEmail,
      callbackURL: "/verify-email/confirm",
    });
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    const verifiedResend = await postAuth("/send-verification-email", {
      email: testEmail,
      callbackURL: "/verify-email/confirm",
    });
    assert.equal(verificationSuccess.status, unknownResend.status);
    assert.equal(verificationSuccess.bodyText, unknownResend.bodyText);
    assert.equal(verificationSuccess.status, verifiedResend.status);
    assert.equal(verificationSuccess.bodyText, verifiedResend.bodyText);
    assert.equal(
      resendComparisonSender.sentEmails.length,
      0,
      "Unknown and already-verified resend requests must not invoke the sender",
    );

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: false },
    });

    const verificationFailureSender = new RecordingFailureSender();
    setTestEmailSender(verificationFailureSender);
    const verificationFailure = await captureConsole(async () => {
      const response = await postAuth("/send-verification-email", {
        email: testEmail,
        callbackURL: "/verify-email/confirm",
      });
      await scheduler.drain();
      return response;
    });
    assert.equal(verificationFailure.value.status, 200);
    assert.deepEqual(verificationFailure.value.body, { status: true });
    const failedVerificationToken = verificationToken(
      verificationFailureSender.payload,
    );
    assertNotObservable(verificationFailure.value, verificationFailure.logs, [
      testEmail,
      verificationFailureSender.providerError,
      failedVerificationToken,
    ]);
    assert.deepEqual(verificationFailure.logs, [
      AUTH_EMAIL_DELIVERY_ERROR_MESSAGE,
    ]);
    await assertNotInBeautyBookRecords(failedVerificationToken);

    const throwingSender = new ThrowingSender();
    setTestEmailSender(throwingSender);
    const verificationThrow = await captureConsole(async () => {
      const response = await postAuth("/send-verification-email", {
        email: testEmail,
        callbackURL: "/verify-email/confirm",
      });
      await scheduler.drain();
      return response;
    });
    assert.equal(verificationThrow.value.status, 200);
    assert.deepEqual(verificationThrow.value.body, { status: true });
    const thrownVerificationToken = verificationToken(throwingSender.payload);
    assertNotObservable(verificationThrow.value, verificationThrow.logs, [
      testEmail,
      throwingSender.providerError,
      thrownVerificationToken,
    ]);
    assert.deepEqual(verificationThrow.logs, [
      AUTH_EMAIL_DELIVERY_ERROR_MESSAGE,
    ]);
    await assertNotInBeautyBookRecords(thrownVerificationToken);

    // A known reset starts the deferred sender but must complete its public
    // response before that sender can settle. The unknown path must expose the
    // exact same status/body without invoking the sender.
    const resetSender = new DeferredEmailSender();
    setTestEmailSender(resetSender);
    const resetRequest = postAuth("/request-password-reset", {
      email: testEmail,
      redirectTo: "/reset-password",
    });
    const resetSuccess = await expectResponseBeforeProviderRelease(
      resetRequest,
      resetSender,
    );
    assertGenericResetResponse(resetSuccess);
    const resetSuccessToken = resetToken(resetSender.payload);
    resetSender.release();
    await scheduler.drain();
    await assertNotInBeautyBookRecords(resetSuccessToken);

    const resetFailureSender = new RecordingFailureSender();
    setTestEmailSender(resetFailureSender);
    const resetComparison = await captureConsole(async () => {
      const knownFailure = await postAuth("/request-password-reset", {
        email: testEmail,
        redirectTo: "/reset-password",
      });
      await scheduler.drain();
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
      testEmail,
      resetFailureSender.providerError,
      failedResetToken,
    ]);
    assert(
      resetComparison.logs.includes(AUTH_EMAIL_DELIVERY_ERROR_MESSAGE),
      "Reset delivery failure must remain internally observable",
    );
    assert.equal(
      resetComparison.logs.filter(
        (entry) => entry === AUTH_EMAIL_DELIVERY_ERROR_MESSAGE,
      ).length,
      1,
    );
    await assertNotInBeautyBookRecords(failedResetToken);

    assert.equal(
      await prisma.notificationDelivery.count(),
      notificationCountBefore,
      "Auth email handling must not create NotificationDelivery rows",
    );

    console.log("verify-auth-email-delivery: ok", {
      signupNew: newSignup.status,
      signupDuplicateUnverified: duplicateUnverified.status,
      signupDuplicateVerified: duplicateVerified.status,
      signupPublicSemanticsEqual: true,
      verificationSuccess: verificationSuccess.status,
      verificationFailure: verificationFailure.value.status,
      verificationThrow: verificationThrow.value.status,
      verificationUnknown: unknownResend.status,
      verificationAlreadyVerified: verifiedResend.status,
      verificationPublicResponsesEqual: true,
      verificationProviderNonBlocking: true,
      resetSuccess: resetSuccess.status,
      resetFailure: knownFailure.status,
      unknownReset: unknown.status,
      publicResetResponsesEqual: true,
      resetProviderNonBlocking: true,
      tokenHygiene: true,
    });
  } finally {
    setTestAuthEmailScheduler(null);
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
