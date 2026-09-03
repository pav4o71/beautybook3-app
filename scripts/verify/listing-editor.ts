import { prisma } from "@/lib/prisma";
import { parseStorefrontLayout } from "@/lib/listing-layout";
import { resolveListingTheme } from "@/lib/listing-theme";
import { isPremiumListing } from "@/lib/listing";

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { published: true },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      locations: { where: { active: true }, take: 1 },
      featuredService: { include: { category: true } },
    },
    orderBy: [{ listingTier: "desc" }, { name: "asc" }],
  });

  if (orgs.length === 0) {
    throw new Error("No published organizations found.");
  }

  for (const org of orgs) {
    if (!org.name.trim()) {
      throw new Error(`Organization ${org.id} missing name.`);
    }
    const layout = parseStorefrontLayout(org.storefrontLayout);
    if (layout.length === 0) {
      throw new Error(`Organization ${org.slug} has empty layout.`);
    }
    const theme = resolveListingTheme(org.listingTheme, org.accentColor, org.listingTier);
    if (!theme.backgroundColor.startsWith("#")) {
      throw new Error(`Organization ${org.slug} has invalid theme.`);
    }
    const primary = org.locations[0];
    if (primary && !primary.city) {
      throw new Error(`Organization ${org.slug} location missing city.`);
    }
    if (isPremiumListing(org.listingTier) && org.photoLimit < 1) {
      throw new Error(`Premium org ${org.slug} has invalid photo limit.`);
    }
  }

  const premium = orgs.filter((o) => isPremiumListing(o.listingTier));
  const standard = orgs.filter((o) => !isPremiumListing(o.listingTier));

  console.log(
    `listing-editor: ${orgs.length} orgs (${premium.length} premium, ${standard.length} standard)`,
  );
  console.log("listing-editor: theme, layout, and photo models validated");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
