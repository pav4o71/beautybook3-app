import { DashboardNav } from "./dashboard-nav";
import { requireUser } from "@/lib/require-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav />
      {children}
    </div>
  );
}
