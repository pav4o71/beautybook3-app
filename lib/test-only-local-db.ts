const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ALLOWED_DATABASES = new Set([
  "beautybook",
  "beautybook_test",
  "beautybook_dev",
  "ci",
  "test",
]);
const FORBIDDEN_QUERY_KEYS = new Set(["host", "hostaddr", "port"]);

export const REFUSAL_PREFIX =
  "Refusing: mutating test, seed, and verify commands require a confirmed local test/dev database.";

function databaseName(pathname: string): string | null {
  if (!pathname.startsWith("/")) {
    return null;
  }

  const name = pathname.slice(1);
  if (name === "" || name.includes("/")) {
    return null;
  }

  return name;
}

export function assertLocalOnlyDatabaseUrl(url: string | undefined): void {
  if (typeof url !== "string" || url.trim() === "") {
    throw new Error(`${REFUSAL_PREFIX} DATABASE_URL is not set or empty.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(`${REFUSAL_PREFIX} Malformed DATABASE_URL.`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    throw new Error(
      `${REFUSAL_PREFIX} Invalid protocol '${parsed.protocol}'. Expected postgres: or postgresql:.`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(
      `${REFUSAL_PREFIX} Host '${parsed.hostname}' is not a permitted local loopback host (localhost, 127.0.0.1, [::1]).`,
    );
  }

  const db = databaseName(parsed.pathname);
  if (!db || !ALLOWED_DATABASES.has(db)) {
    throw new Error(
      `${REFUSAL_PREFIX} Database '${db ?? ""}' is not an approved test/dev database (${Array.from(
        ALLOWED_DATABASES,
      ).join(", ")}).`,
    );
  }

  for (const key of parsed.searchParams.keys()) {
    if (FORBIDDEN_QUERY_KEYS.has(key.toLowerCase())) {
      throw new Error(
        `${REFUSAL_PREFIX} Forbidden connection override parameter '${key}' in query string.`,
      );
    }
  }
}

export function assertLocalOnlyDatabase(): void {
  assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);
}
