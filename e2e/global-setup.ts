import { execSync } from "node:child_process";

export default async function globalSetup() {
  execSync("npm run prisma:seed", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
}
