import { redirect } from "next/navigation";
import { requireActiveOrgAdmin } from "@/lib/require-org";

export async function requireAdmin() {
  return requireActiveOrgAdmin();
}
