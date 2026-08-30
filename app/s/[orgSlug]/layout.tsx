import { notFound } from "next/navigation";
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

  return children;
}
