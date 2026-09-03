const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);
const REQUIRED_PORT = "5433";
const REQUIRED_DATABASE = "beautybook";
const FORBIDDEN_QUERY_KEYS = new Set(["host", "hostaddr", "port"]);

const REFUSAL =
  "Refusing: this command requires the local Docker Postgres database only.";

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
    throw new Error(REFUSAL);
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(REFUSAL);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(REFUSAL);
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(REFUSAL);
  }

  if (parsed.port !== REQUIRED_PORT) {
    throw new Error(REFUSAL);
  }

  if (databaseName(parsed.pathname) !== REQUIRED_DATABASE) {
    throw new Error(REFUSAL);
  }

  for (const key of parsed.searchParams.keys()) {
    if (FORBIDDEN_QUERY_KEYS.has(key.toLowerCase())) {
      throw new Error(REFUSAL);
    }
  }
}

export function assertLocalOnlyDatabase(): void {
  assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);
}
