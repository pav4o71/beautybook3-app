import { AdminNav, type AdminNavSection } from "./admin-nav";

export function AdminCatalogNav({ current }: { current: Exclude<AdminNavSection, "appointments"> }) {
  return <AdminNav current={current} />;
}
