import "dotenv/config";
import { execSync } from "node:child_process";
import { assertLocalOnlyDatabase } from "../lib/test-only-local-db";

export default async function globalSetup() {
  assertLocalOnlyDatabase();
  execSync("npm run prisma:seed", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
}
