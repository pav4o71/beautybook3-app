import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // ============================================
  // 1. SEED CATEGORIES
  // ============================================
  const categories = [
    { name: 'Hair Salon', slug: 'hair-salon', icon: 'scissors', description: 'Haircuts, coloring, styling, and treatments' },
    { name: 'Nail Studio', slug: 'nail-studio', icon: 'sparkles', description: 'Manicures, pedicures, and nail art' },
    { name: 'Spa & Wellness', slug: 'spa-wellness', icon: 'flower-2', description: 'Massages, facials, and body treatments' },
    { name: 'Barber Shop', slug: 'barber-shop', icon: 'user', description: "Men's haircuts, beard trimming, and grooming" },
    { name: 'Makeup Artist', slug: 'makeup-artist', icon: 'brush', description: 'Professional makeup for events and occasions' },
    { name: 'Eyelash & Brows', slug: 'eyelash-brows', icon: 'eye', description: 'Lash extensions, tinting, and brow shaping' },
    { name: 'Skin Care', slug: 'skin-care', icon: 'droplet', description: 'Facials, peels, and skin treatments' },
    { name: 'Massage Therapy', slug: 'massage-therapy', icon: 'heart', description: 'Therapeutic and relaxation massages' },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }
  console.log(`✅ Seeded ${categories.length} categories`)

  // ============================================
  // 2. SEED MANILA AREAS
  // ============================================
  const manilaAreas = [
    { name: 'Makati', region: 'Metro Manila' },
    { name: 'BGC (Taguig)', region: 'Metro Manila' },
    { name: 'Quezon City', region: 'Metro Manila' },
    { name: 'Mandaluyong', region: 'Metro Manila' },
    { name: 'Pasig', region: 'Metro Manila' },
    { name: 'Ortigas', region: 'Metro Manila' },
    { name: 'Alabang', region: 'Metro Manila' },
    { name: 'Parañ±³³e', region: 'Metro Manila' },
    { name: 'Las Piñ±¡±', region: 'Metro Manila' },
    { name: 'Manila (City Proper)', region: 'Metro Manila' },
    { name: 'San Juan', region: 'Metro Manila' },
    { name: 'Pasay', region: 'Metro Manila' },
    { name: 'Taguig', region: 'Metro Manila' },
    { name: 'Pateros', region: 'Metro Manila' },
    { name: 'Marikina', region: 'Metro Manila' },
  ]

  // Store areas in a simple JSON file for reference
  console.log(`✅ Prepared ${manilaAreas.length} Metro Manila areas`)

  // ============================================
  // 3. SEED SAMPLE TENANT (BUSINESS)
  // ============================================
  const adminPassword = await hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@beautybook3.ph' },
    update: {},
    create: {
      email: 'admin@beautybook3.ph',
      name: 'Platform Admin',
      role: 'ADMIN',
      password: adminPassword,
    },
  })

  const sampleTenant = await prisma.tenant.upsert({
    where: { slug: 'daisy-beauty-salon' },
    update: {},
    create: {
      name: 'Daisy Beauty Salon',
      slug: 'daisy-beauty-salon',
      email: 'daisy@beautybook3.ph',
      phone: '+63 917 123 4567',
      description: 'Your one-stop beauty destination in Parañ±³³e',
      isActive: true,
    },
  })

  const sampleLocation = await prisma.location.create({
    data: {
      tenantId: sampleTenant.id,
      name: 'Main Branch',
      address: '123 Main Street, Parañ±³³e',
      area: 'Parañ±³³e',
      city: 'Manila',
      region: 'Metro Manila',
      latitude: 14.4793,
      longitude: 120.9842,
      phone: '+63 917 123 4567',
      isActive: true,
    },
  })

  console.log(`✅ Seeded sample tenant: ${sampleTenant.name}`)

  // ============================================
  // 4. SEED SAMPLE SERVICES
  // ============================================
  const hairCategory = await prisma.category.findUnique({
    where: { slug: 'hair-salon' },
  })

  const nailCategory = await prisma.category.findUnique({
    where: { slug: 'nail-studio' },
  })

  if (hairCategory && nailCategory) {
    const services = [
      // Hair Services
      { name: 'Haircut', description: 'Professional haircut and styling', duration: 30, price: 500, categoryId: hairCategory.id },
      { name: 'Hair Coloring', description: 'Full hair coloring service', duration: 90, price: 1500, categoryId: hairCategory.id },
      { name: 'Hair Treatment', description: 'Deep conditioning and repair', duration: 60, price: 800, categoryId: hairCategory.id },
      { name: 'Blowout', description: 'Wash and blow-dry styling', duration: 45, price: 400, categoryId: hairCategory.id },
      
      // Nail Services
      { name: 'Manicure', description: 'Basic manicure with polish', duration: 45, price: 350, categoryId: nailCategory.id },
      { name: 'Pedicure', description: 'Relaxing pedicure treatment', duration: 60, price: 450, categoryId: nailCategory.id },
      { name: 'Gel Nails', description: 'Gel polish application', duration: 90, price: 800, categoryId: nailCategory.id },
      { name: 'Nail Art', description: 'Custom nail art design', duration: 60, price: 500, categoryId: nailCategory.id },
    ]

    for (const service of services) {
      await prisma.service.create({
        data: {
          ...service,
          tenantId: sampleTenant.id,
          locationId: sampleLocation.id,
          currency: 'PHP',
          isActive: true,
        },
      })
    }

    console.log(`✅ Seeded ${services.length} sample services`)
  }

  // ============================================
  // 5. SEED SUBSCRIPTION PLANS
  // ============================================
  await prisma.subscription.create({
    data: {
      tenantId: sampleTenant.id,
      plan: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  })

  console.log('✅ Seeded subscription plans')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Next steps:')
  console.log('   1. Run: npx prisma migrate dev')
  console.log('   2. Run: npx prisma db seed')
  console.log('   3. Login with: admin@beautybook3.ph / admin123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
