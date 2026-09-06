import { SiteHeader } from "@/components/site-header";

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
