import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { assertSafeVerifyTarget } from "./assert-safe-target";

const root = path.resolve(import.meta.dirname, "../..");
const scripts = [
  "format.ts",
  "seed-counts.ts",
  "slots.ts",
  "booking.ts",
  "appointments.ts",
];

assertSafeVerifyTarget();

let failed = false;

for (const script of scripts) {
  const result = spawnSync("npx", ["tsx", path.join("scripts/verify", script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error("verify: one or more checks failed");
  process.exit(1);
}

console.log("verify: all checks passed");
