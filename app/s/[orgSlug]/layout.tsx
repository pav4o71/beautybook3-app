import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";

export default async function SalonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getPublishedOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
