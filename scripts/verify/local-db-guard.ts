import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";

const REFUSAL =
  "Refusing: this command requires the local Docker Postgres database only.";

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
      error instanceof Error && error.message === REFUSAL,
      `expected refusal for ${label}`,
    );
    console.log("reject", label);
  }
}

expectAccept("localhost", "postgresql://beautybook:dummy@localhost:5433/beautybook");
expectAccept("loopback", "postgres://beautybook:dummy@127.0.0.1:5433/beautybook");
expectAccept(
  "sslmode",
  "postgresql://beautybook:dummy@localhost:5433/beautybook?sslmode=disable",
);

expectReject("missing", undefined);
expectReject("empty", "");
expectReject("malformed", "not-a-url");
expectReject(
  "supabase-pooler",
  "postgresql://beautybook:dummy@example.pooler.supabase.com:5432/postgres",
);
expectReject("remote-host", "postgresql://beautybook:dummy@203.0.113.10:5433/beautybook");
expectReject("wrong-port", "postgresql://beautybook:dummy@localhost:5432/beautybook");
expectReject("wrong-database", "postgresql://beautybook:dummy@localhost:5433/postgres");
expectReject("host-override", "postgresql://beautybook:dummy@localhost:5433/beautybook?host=db.example.com");
expectReject("port-override", "postgresql://beautybook:dummy@localhost:5433/beautybook?port=5432");

console.log("verify-local-db-guard: ok");
