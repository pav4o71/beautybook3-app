import {
  assertLocalOnlyDatabaseUrl,
  REFUSAL_PREFIX,
} from "../../lib/test-only-local-db";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectAccept(label: string, url: string) {
  assertLocalOnlyDatabaseUrl(url);
  console.log("accept", label);
}

function expectReject(label: string, url: string | undefined) {
  try {
    assertLocalOnlyDatabaseUrl(url);
    throw new Error(`unexpected accept: ${label}`);
  } catch (error) {
    assert(
      error instanceof Error && error.message.startsWith(REFUSAL_PREFIX),
      `expected refusal for ${label}, got: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log("reject", label);
  }
}

// Allowed local targets
expectAccept("localhost-docker", "postgresql://beautybook:dummy@localhost:5433/beautybook");
expectAccept("loopback-ipv4", "postgres://beautybook:dummy@127.0.0.1:5433/beautybook");
expectAccept("loopback-ipv6", "postgresql://beautybook:dummy@[::1]:5433/beautybook");
expectAccept("ci-runner-db", "postgresql://ci:dummy@localhost:5432/ci?sslmode=disable");
expectAccept("test-db-name", "postgresql://beautybook:dummy@127.0.0.1:5433/beautybook_test");
expectAccept("dev-db-name", "postgresql://beautybook:dummy@localhost:5433/beautybook_dev");
expectAccept(
  "sslmode-param",
  "postgresql://beautybook:dummy@localhost:5433/beautybook?sslmode=disable",
);

// Rejected remote, invalid, or dangerous targets
expectReject("missing", undefined);
expectReject("empty", "");
expectReject("malformed", "not-a-url");
expectReject("invalid-protocol", "http://localhost:5433/beautybook");
expectReject(
  "supabase-pooler",
  "postgresql://beautybook:dummy@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
);
expectReject(
  "supabase-custom-domain",
  "postgresql://beautybook:dummy@example.pooler.supabase.com:6543/postgres",
);
expectReject("remote-public-ip", "postgresql://beautybook:dummy@203.0.113.10:5433/beautybook");
expectReject("private-lan-ip", "postgresql://beautybook:dummy@192.168.1.50:5433/beautybook");
expectReject("disallowed-db-postgres", "postgresql://beautybook:dummy@localhost:5433/postgres");
expectReject("disallowed-db-production", "postgresql://beautybook:dummy@localhost:5433/production");
expectReject("missing-db-name", "postgresql://beautybook:dummy@localhost:5433/");
expectReject(
  "host-override-param",
  "postgresql://beautybook:dummy@localhost:5433/beautybook?host=evil.com",
);
expectReject(
  "hostaddr-override-param",
  "postgresql://beautybook:dummy@localhost:5433/beautybook?hostaddr=1.2.3.4",
);
expectReject(
  "port-override-param",
  "postgresql://beautybook:dummy@localhost:5433/beautybook?port=5432",
);

console.log("verify-local-db-guard: ok");
