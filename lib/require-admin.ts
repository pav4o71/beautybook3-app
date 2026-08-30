import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";

export async function requireAdmin() {
  const session = await requireUser();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}
