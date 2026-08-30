# BeautyBook3 SaaS - Implementation Phases

## Overview

This document provides detailed, step-by-step implementation checklists for each phase of the SaaS migration.

---

## Phase 1: Multi-Tenant Foundation (Weeks 1-2)

### Goal
Transform single-salon database to multi-tenant architecture while preserving existing functionality.

### Prerequisites
- [ ] Staging environment set up
- [ ] Database backup strategy in place
- [ ] Phase 1 branch created: `git checkout -b feat/saas-phase-1-multi-tenant`

### Step 1: Database Schema Changes

#### 1.1 Update prisma/schema.prisma

Add these models to your existing schema:

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  timezone    String   @default("Asia/Manila")
  currency    String   @default("PHP")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  members     OrganizationMember[]
  staff       Staff[]
  services    Service[]
  appointments Appointment[]
  settings    OrganizationSettings?
  
  @@index([slug])
}

model OrganizationMember {
  organizationId String
  userId         String
  role           OrgRole  @default(MEMBER)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@id([organizationId, userId])
  @@index([userId])
}

enum OrgRole {
  OWNER
  ADMIN
  STAFF
  MEMBER
}

model OrganizationSettings {
  id             String   @id @default(cuid())
  organizationId String   @unique
  timezone       String   @default("Asia/Manila")
  currency       String   @default("PHP")
  bookingEnabled Boolean  @default(true)
  advanceBookingDays Int  @default(30)
  slotDurationMinutes Int @default(30)
  
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### 1.2 Add organizationId to existing models

Update these models in your schema:

```prisma
model Staff {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])  // ADD THIS
}

model Service {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])  // ADD THIS
}

model Appointment {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])  // ADD THIS
}
```

#### 1.3 Create migration

```bash
# Generate migration
npm run prisma:migrate:dev -- --name add_multi_tenant_foundation

# Verify migration file was created
ls -la prisma/migrations/
```

#### 1.4 Update seed script

Edit `prisma/seed.ts`:

```typescript
// Create default organization
const defaultOrg = await prisma.organization.create({
  data: {
    name: 'BeautyBook3 Demo Salon',
    slug: 'demo-salon',
    timezone: 'Asia/Manila',
    currency: 'PHP',
  }
});

console.log('Created default organization:', defaultOrg.id);

// Update all existing data to point to default org
await prisma.staff.updateMany({
  data: { organizationId: defaultOrg.id }
});

await prisma.service.updateMany({
  data: { organizationId: defaultOrg.id }
});

await prisma.appointment.updateMany({
  data: { organizationId: defaultOrg.id }
});

console.log('Updated all data to default organization');
```

#### 1.5 Run migration on staging

```bash
# Test migration on staging database
npm run prisma:migrate:dev

# Verify tables created
npm run prisma:studio

# Check Organization table exists
# Check organizationId column added to Staff, Service, Appointment
```

### Step 2: Update lib/ Functions

#### 2.1 Update lib/catalog.ts

Add organizationId parameter to all functions:

```typescript
// Before
export async function listServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' }
  });
}

// After
export async function listServices(organizationId: string) {
  return prisma.service.findMany({
    where: {
      organizationId,  // ADD THIS
      isActive: true,
    },
    include: { category: true },
    orderBy: { name: 'asc' }
  });
}
```

Update all catalog functions:
- [ ] `listServices(organizationId)`
- [ ] `listCategories(organizationId)`
- [ ] `listStaff(organizationId)`
- [ ] `getService(serviceId, organizationId)`
- [ ] `getStaff(staffId, organizationId)`

#### 2.2 Update lib/booking.ts

```typescript
// Before
export async function createAppointment(data: CreateAppointmentData) {
  return prisma.appointment.create({
    data: {
      ...data,
      // ...
    }
  });
}

// After
export async function createAppointment(
  data: CreateAppointmentData,
  organizationId: string
) {
  return prisma.appointment.create({
    data: {
      ...data,
      organizationId,  // ADD THIS
    }
  });
}
```

Update all booking functions:
- [ ] `createAppointment(data, organizationId)`
- [ ] `getAvailableSlots(serviceId, date, organizationId)`
- [ ] `updateAppointmentStatus(appointmentId, status, organizationId)`

#### 2.3 Update lib/appointments.ts

```typescript
// Before
export async function listCustomerAppointments(customerId: string) {
  return prisma.appointment.findMany({
    where: { customerId },
    include: { services: { include: { service: true } } }
  });
}

// After
export async function listCustomerAppointments(
  customerId: string,
  organizationId: string
) {
  return prisma.appointment.findMany({
    where: {
      customerId,
      organizationId,  // ADD THIS
    },
    include: { services: { include: { service: true } } }
  });
}
```

### Step 3: Update Server Actions

#### 3.1 Update app/dashboard/book/actions.ts

```typescript
// Before
export async function createAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');
  
  const appointment = await createAppointment(formData);
  // ...
}

// After
export async function createAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Get user's organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id }
  });
  
  if (!membership) {
    throw new Error('No organization found');
  }
  
  const appointment = await createAppointment(formData, membership.organizationId);
  // ...
}
```

Update all actions:
- [ ] `createAppointmentAction`
- [ ] `cancelAppointmentAction`
- [ ] All catalog management actions

#### 3.2 Update app/dashboard/admin/services/actions.ts

```typescript
export async function createServiceAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Get organization from form or session
  const organizationId = formData.get('organizationId') as string;
  
  // Verify membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    }
  });
  
  if (!membership) throw new Error('Unauthorized');
  
  // Create service
  await prisma.service.create({
    data: {
      organizationId,
      name: formData.get('name') as string,
      // ...
    }
  });
  
  revalidatePath(`/dashboard/admin/services`);
}
```

### Step 4: Update Pages

#### 4.1 Update app/dashboard/page.tsx

```typescript
export default async function DashboardPage() {
  const session = await getSession();
  
  // Get user's organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session?.user.id }
  });
  
  if (!membership) {
    redirect('/dashboard/organizations/new');
  }
  
  // Use membership.organizationId for all queries
  const appointments = await listAppointments(membership.organizationId);
  const services = await listServices(membership.organizationId);
  
  // ...
}
```

#### 4.2 Update all dashboard pages

Update these pages to use organization-scoped queries:
- [ ] `/dashboard/services`
- [ ] `/dashboard/staff`
- [ ] `/dashboard/book`
- [ ] `/dashboard/appointments`
- [ ] `/dashboard/admin/*`

### Step 5: Testing

#### 5.1 Run verification scripts

```bash
# Run all verify scripts
npm run verify

# Individual scripts
npm run verify:seed
npm run verify:slots
npm run verify:booking
npm run verify:appointments
```

#### 5.2 Run E2E tests

```bash
# Run E2E tests
npm run test:e2e

# Check all tests pass
# auth.spec.ts
# booking.spec.ts
# catalog.spec.ts
# admin-appointments.spec.ts
```

#### 5.3 Manual testing

- [ ] Login as admin
- [ ] View services (should show data)
- [ ] View staff (should show data)
- [ ] Create new service (should work)
- [ ] Book appointment (should work)
- [ ] View appointments (should show data)

### Step 6: Code Review

- [ ] All queries use organizationId
- [ ] No hardcoded organization IDs
- [ ] All server actions verify membership
- [ ] No data leaks between organizations
- [ ] TypeScript types are correct
- [ ] No ESLint errors

### Step 7: Deploy to Staging

```bash
# Push to staging branch
git push origin feat/saas-phase-1-multi-tenant

# Create PR
# Review and merge
# Deploy to staging

# Test on staging
# Verify all features work
```

### Step 8: Deploy to Production

```bash
# Backup production database
# Deploy migration
npm run prisma:migrate

# Deploy code
# Monitor logs
# Verify on production
```

---

## Phase 2: Organization Management (Weeks 3-4)

### Goal
Enable users to create and manage multiple organizations.

### Prerequisites
- [ ] Phase 1 complete and deployed
- [ ] Phase 2 branch: `git checkout -b feat/saas-phase-2-org-management`

### Step 1: Create Organization Pages

#### 1.1 Create app/dashboard/organizations/page.tsx

```typescript
export default async function OrganizationsPage() {
  const session = await getSession();
  
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session?.user.id },
    include: { organization: true }
  });
  
  return (
    <div>
      <h1>Your Organizations</h1>
      <Link href="/dashboard/organizations/new">Create New</Link>
      
      <ul>
        {memberships.map(m => (
          <li key={m.organization.id}>
            <Link href={`/dashboard/org/${m.organization.id}`}>
              {m.organization.name}
            </Link>
            ({m.role})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### 1.2 Create app/dashboard/organizations/new/page.tsx

```typescript
export default function NewOrganizationPage() {
  return (
    <div>
      <h1>Create Organization</h1>
      <form action={createOrganizationAction}>
        <input name="name" placeholder="Organization name" required />
        <input name="slug" placeholder="slug" required />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
```

#### 1.3 Create app/dashboard/organizations/new/actions.ts

```typescript
'use server';

export async function createOrganizationAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');
  
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  // Check slug uniqueness
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw new Error('Slug already taken');
  
  // Create organization
  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      timezone: 'Asia/Manila',
      currency: 'PHP',
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        }
      }
    }
  });
  
  // Create settings
  await prisma.organizationSettings.create({
    data: { organizationId: org.id }
  });
  
  revalidatePath('/dashboard/organizations');
  redirect(`/dashboard/org/${org.id}`);
}
```

### Step 2: Organization Switcher

#### 2.1 Create app/dashboard/org-switcher.tsx

```typescript
'use client';

export function OrganizationSwitcher() {
  // Fetch organizations
  // Render dropdown
  // On change: set cookie and reload
}
```

#### 2.2 Add to dashboard layout

```typescript
// app/dashboard/layout.tsx
import { OrganizationSwitcher } from './org-switcher';

export default function DashboardLayout({ children }) {
  return (
    <div>
      <OrganizationSwitcher />
      {children}
    </div>
  );
}
```

### Step 3: Middleware

#### 3.1 Create middleware.ts

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: Request) {
  const session = await auth();
  const { nextUrl } = request;
  
  // Get current org from cookie
  const orgCookie = request.cookies.get('current_org');
  const currentOrgId = orgCookie?.value;
  
  // Redirect if no org selected
  if (nextUrl.pathname.startsWith('/dashboard') && !currentOrgId) {
    return NextResponse.redirect(new URL('/dashboard/organizations', nextUrl));
  }
  
  // Add org to headers
  const response = NextResponse.next();
  if (currentOrgId) {
    response.headers.set('x-organization-id', currentOrgId);
  }
  
  return response;
}

export const config = {
  matcher: '/dashboard/:path*'
};
```

### Step 4: Testing

- [ ] Create new organization
- [ ] Switch between organizations
- [ ] Verify data isolation
- [ ] Run E2E tests
- [ ] Deploy to staging

---

## Phase 3: Public Marketplace (Weeks 5-6)

### Goal
Allow customers to browse and book without login.

### Step 1: Public Routes

#### 1.1 Create app/page.tsx

```typescript
export default function HomePage() {
  return (
    <div>
      <h1>BeautyBook3</h1>
      <p>Book beauty services in Manila</p>
      
      <h2>Browse Categories</h2>
      {/* Category grid */}
      
      <Link href="/login">Login</Link>
    </div>
  );
}
```

#### 1.2 Create app/browse/[category]/page.tsx

```typescript
export default async function CategoryPage({ params }) {
  const services = await prisma.service.findMany({
    where: {
      organization: { isActive: true },
      category: { slug: params.category }
    },
    include: { organization: true }
  });
  
  return (
    <div>
      <h1>{params.category}</h1>
      {/* Service list */}
    </div>
  );
}
```

### Step 2: Public Booking

#### 2.1 Create app/book/[serviceId]/page.tsx

```typescript
export default function BookPage({ params }) {
  return (
    <div>
      <h1>Book Service</h1>
      <form action={publicBookAction}>
        <input type="hidden" name="serviceId" value={params.serviceId} />
        <input type="date" name="date" required />
        <input type="time" name="time" required />
        <input name="customerName" required />
        <input type="email" name="customerEmail" required />
        <input type="tel" name="customerPhone" required />
        <button type="submit">Book Now</button>
      </form>
    </div>
  );
}
```

### Step 3: Testing

- [ ] Browse without login
- [ ] Book as guest
- [ ] Verify appointment created
- [ ] Run E2E tests

---

## Phase 4: Monetization (Weeks 7-8)

### Step 1: Stripe Integration

#### 1.1 Install Stripe

```bash
npm install stripe @types/stripe
```

#### 1.2 Add environment variables

```bash
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 2: Subscription Plans

- [ ] Define plans in docs
- [ ] Create Stripe products
- [ ] Implement webhook handler
- [ ] Add plan limits

### Step 3: Testing

- [ ] Test subscription flow
- [ ] Test plan limits
- [ ] Test webhook handling

---

## Next Steps

After completing all phases:

1. Performance optimization
2. Security audit
3. Documentation
4. Launch marketing

Good luck! 🚀
