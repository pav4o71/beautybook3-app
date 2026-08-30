import "dotenv/config";
import { GLOW_ORG_SLUG, LUXE_ORG_SLUG } from "../../lib/demo-constants";
import { listMarketplaceServices } from "../../lib/marketplace";
import { prisma } from "../../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const hair = await listMarketplaceServices({ categorySlug: "hair" });
  const hairOrgs = new Set(hair.map((row) => row.organization.slug));
  assert(hairOrgs.has("beautybook-demo"), "Hair search must include demo salon");
  assert(hairOrgs.has(LUXE_ORG_SLUG), "Hair search must include Luxe Hair Lounge");
  assert(!hairOrgs.has(GLOW_ORG_SLUG), "Hair search must not include Glow Nail Studio");
  assert(
    hair.some((row) => row.name === "Haircut" && row.priceCents === 35000),
    "Hair search must include ₱350 demo haircut",
  );
  assert(
    hair.every((row) => row.organization.slug.length > 0),
    "Marketplace services must include organization slug",
  );

  const hairMakati = await listMarketplaceServices({
    categorySlug: "hair",
    area: "Makati",
  });
  const hairMakatiOrgs = new Set(hairMakati.map((row) => row.organization.slug));
  assert(hairMakatiOrgs.has("beautybook-demo"), "Makati hair search must include demo");
  assert(!hairMakatiOrgs.has(LUXE_ORG_SLUG), "Makati hair search must exclude Ortigas-only Luxe");
  assert(
    hairMakati.every((row) => row.locations.every((location) => location.area === "Makati")),
    "Area filter must only return Makati locations",
  );

  const nailsQc = await listMarketplaceServices({
    categorySlug: "nails",
    area: "Quezon City",
  });
  const nailsQcOrgs = new Set(nailsQc.map((row) => row.organization.slug));
  assert(nailsQcOrgs.has(GLOW_ORG_SLUG), "QC nails search must include Glow");
  assert(
    nailsQc.every((row) =>
      row.locations.every((location) => location.area === "Quezon City"),
    ),
    "QC nails search must only return Quezon City locations",
  );

  const unpublished = await prisma.organization.count({
    where: {
      published: false,
      services: { some: { id: { in: hair.map((row) => row.id) } } },
    },
  });
  assert(unpublished === 0, "Unpublished org services must not appear in marketplace search");

  const nailsBgc = await listMarketplaceServices({
    categorySlug: "nails",
    area: "BGC (Taguig)",
  });
  assert(
    !nailsBgc.some((row) => row.organization.slug === "beautybook-demo"),
    "BGC nails search must not list demo gel (no BGC nail staff)",
  );

  await prisma.$disconnect();
  console.log("verify-marketplace-search: ok", {
    hair: hair.length,
    hairMakati: hairMakati.length,
    nailsQc: nailsQc.length,
  });
}

main().catch((error) => {
  console.error("verify-marketplace-search: failed", error);
  process.exitCode = 1;
});
