# BeautyBook3 SaaS Upgrade Plan

## Executive Summary

**Current State:** Functional single-salon MVP with excellent foundations  
**Target State:** Multi-tenant SaaS platform for multiple beauty salons in Manila  
**Approach:** Incremental migration preserving existing booking functionality  
**Timeline:** 8-10 weeks (4 phases)

---

## Architecture Overview

### Current Architecture
```
┌─────────────────────────────────────┐
│         Single Salon MVP            │
│  ┌───────────────────────────────┐  │
│  │  Better Auth (User, Session)  │  │
│  │  Staff, Service, Appointment  │  │
│  │  All data global (no tenant)  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────────────────────────┐
│              Multi-Tenant SaaS Platform                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Organization (Tenant)                          │   │
│  │  ├─ OrganizationMember (User ↔ Org mapping)     │   │
│  │  ├─ Staff (scoped to org)                       │   │
│  │  ├─ Service (scoped to org)                     │   │
│  │  ├─ Appointment (scoped to org)                 │   │
│  │  └─ OrganizationSettings (timezone, currency)   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Public Marketplace:                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Browse all organizations by category/area      │   │
│  │  Search availability across orgs                │   │
│  │  Book appointments (customer view)              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Multi-Tenant Foundation (Weeks 1-2)

### Goals
- Add Organization model and membership system
- Scope all existing data to organizations
- Preserve existing single-salon functionality
- Create migration path for existing data

### Database Changes

#### New Models
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
  
  // Relations
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
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@id([organizationId, userId])
  @@index([userId])
}

enum OrgRole {
  OWNER    // Can manage org, billing, members
  ADMIN    // Can manage catalog, staff, appointments
  STAFF    // Can view own schedule, update appointments
  MEMBER   // Can book appointments (customer)
}

model OrganizationSettings {
  id             String   @id @default(cuid())
  organizationId String   @unique
  timezone       String   @default("Asia/Manila")
  currency       String   @default("PHP")
  bookingEnabled Boolean  @default(true)
  advanceBookingDays Int  @default(30)
  slotDurationMinutes Int @default(30)
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### Update Existing Models
```prisma
model Staff {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
}

model Service {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
}

model Appointment {
  organizationId String  // ADD THIS
  // ... existing fields
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
}
```

### Migration Strategy

1. **Create migration file**
   ```bash
   npm run prisma:migrate:dev -- --name add_multi_tenant_foundation
   ```

2. **Migration SQL includes:**
   - Create `Organization` table
   - Create `OrganizationMember` table
   - Create `OrganizationSettings` table
   - Add `organizationId` to `Staff`, `Service`, `Appointment`
   - Add indexes on `organizationId`
   - Create default organization for existing data
   - Update all existing rows to point to default org

3. **Seed default organization**
   ```typescript
   // prisma/seed.ts
   const defaultOrg = await prisma.organization.create({
     data: {
       name: 'BeautyBook3 Demo Salon',
       slug: 'demo-salon',
       timezone: 'Asia/Manila',
       currency: 'PHP',
     }
   });
   
   // Update all existing data
   await prisma.staff.updateMany({ data: { organizationId: defaultOrg.id } });
   await prisma.service.updateMany({ data: { organizationId: defaultOrg.id } });
   await prisma.appointment.updateMany({ data: { organizationId: defaultOrg.id } });
   ```

### Code Changes

#### Update lib/catalog.ts
```typescript
// Before
export async function listServices() {
  return prisma.service.findMany({ ... });
}

// After
export async function listServices(organizationId: string) {
  return prisma.service.findMany({
    where: { organizationId },
    // ... existing logic
  });
}
```

#### Update lib/booking.ts
```typescript
// Before
export async function createAppointment(data: {...}) {
  return prisma.appointment.create({ data });
}

// After
export async function createAppointment(data: {...}, organizationId: string) {
  return prisma.appointment.create({
    data: {
      ...data,
      organizationId,
    }
  });
}
```

#### Update all server actions
```typescript
// app/dashboard/book/actions.ts
export async function createAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Get user's primary organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id }
  });
  
  if (!membership) throw new Error('No organization');
  
  // Pass organizationId to booking logic
  const appointment = await createAppointment(formData, membership.organizationId);
  // ...
}
```

### Testing Checklist

- [ ] Existing booking flow still works
- [ ] Admin catalog management works
- [ ] All queries filtered by organization
- [ ] E2E tests pass
- [ ] Verify scripts pass

---

## Phase 2: Organization Management (Weeks 3-4)

### Goals
- Add organization creation and onboarding
- Implement organization switcher
- Add member invitation system
- Create organization settings page

### New Features

#### 1. Organization Creation
**Route:** `/dashboard/organizations/new`

**Form fields:**
- Organization name
- Slug (auto-generated, editable)
- Timezone (default: Asia/Manila)
- Currency (default: PHP)
- Business type (Salon, Spa, Barbershop, etc.)

**Server action:**
```typescript
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
  
  // Create default settings
  await prisma.organizationSettings.create({
    data: {
      organizationId: org.id,
    }
  });
  
  revalidatePath('/dashboard');
  redirect(`/dashboard/org/${org.id}`);
}
```

#### 2. Organization Switcher
**Component:** `app/dashboard/org-switcher.tsx`

```typescript
'use client';

export function OrganizationSwitcher() {
  const [memberships, setMemberships] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  
  useEffect(() => {
    // Fetch user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: { organization: true }
    });
    setMemberships(memberships);
  }, []);
  
  return (
    <select
      value={currentOrg?.id}
      onChange={(e) => {
        const orgId = e.target.value;
        // Set cookie or session
        document.cookie = `current_org=${orgId}; path=/`;
        window.location.reload();
      }}
    >
      {memberships.map(m => (
        <option key={m.organization.id} value={m.organization.id}>
          {m.organization.name}
        </option>
      ))}
    </select>
  );
}
```

#### 3. Member Invitation
**Route:** `/dashboard/org/[id]/members`

**Form:**
- Email input
- Role selector (ADMIN, STAFF, MEMBER)
- Send invitation button

**Server action:**
```typescript
export async function inviteMemberAction(formData: FormData) {
  const session = await getSession();
  const orgId = formData.get('organizationId') as string;
  
  // Verify user is OWNER or ADMIN
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  });
  
  if (!membership) throw new Error('Unauthorized');
  
  const email = formData.get('email') as string;
  const role = formData.get('role') as OrgRole;
  
  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, role: 'CUSTOMER' }
    });
  }
  
  // Create or update membership
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: user.id
      }
    },
    create: {
      organizationId: orgId,
      userId: user.id,
      role
    },
    update: { role }
  });
  
  // TODO: Send email notification
  revalidatePath(`/dashboard/org/${orgId}/members`);
}
```

#### 4. Organization Settings
**Route:** `/dashboard/org/[id]/settings`

**Tabs:**
- General (name, slug, timezone, currency)
- Booking (advance booking days, slot duration)
- Branding (logo, colors - future)
- Billing (subscription - Phase 4)

### Middleware Setup

**New file:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: Request) {
  const session = await auth();
  const { nextUrl } = request;
  
  // Get current organization from cookie
  const orgCookie = request.cookies.get('current_org');
  const currentOrgId = orgCookie?.value;
  
  // If accessing dashboard without org, redirect to org selector
  if (nextUrl.pathname.startsWith('/dashboard') && !currentOrgId) {
    return NextResponse.redirect(new URL('/dashboard/organizations', nextUrl));
  }
  
  // Add org context to headers for server actions
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

### Testing Checklist

- [ ] Can create new organization
- [ ] Can switch between organizations
- [ ] Can invite members
- [ ] Settings page works
- [ ] All queries scoped to current org
- [ ] E2E tests updated for multi-org

---

## Phase 3: Public Marketplace (Weeks 5-6)

### Goals
- Create public booking flow (no login required)
- Add category and service browsing
- Implement availability search across organizations
- Add location/area filtering (Manila)

### New Routes

#### 1. Public Homepage
**Route:** `/`

**Features:**
- Search bar (service, area)
- Category grid
- Featured organizations
- How it works section

#### 2. Category Browse
**Route:** `/browse/[category]`

**Features:**
- List of services in category
- Filter by area
- Sort by price, rating, distance

**Query:**
```typescript
const services = await prisma.service.findMany({
  where: {
    organization: {
      isActive: true,
      settings: { bookingEnabled: true }
    },
    category: { slug: categorySlug }
  },
  include: {
    organization: {
      include: {
        settings: true,
        staff: {
          where: { isActive: true }
        }
      }
    }
  }
});
```

#### 3. Service Detail
**Route:** `/browse/[category]/[serviceId]`

**Features:**
- Service description
- Price range across orgs
- Available organizations
- Book button

#### 4. Availability Search
**Route:** `/api/public/availability`

**Request:**
```typescript
POST /api/public/availability
{
  serviceId: string,
  date: string, // YYYY-MM-DD
  area?: string,
  timePreference?: 'morning' | 'afternoon' | 'evening'
}
```

**Response:**
```typescript
{
  success: boolean,
  data: {
    serviceId: string,
    date: string,
    slots: Array<{
      organizationId: string,
      organizationName: string,
      area: string,
      address: string,
      price: number,
      availableTimes: string[] // ["09:00", "10:00", ...]
    }>
  }
}
```

#### 5. Public Booking
**Route:** `/book/[serviceId]`

**Flow:**
1. Select date
2. Select time
3. Select organization (if multiple)
4. Enter customer details (name, email, phone)
5. Confirm booking
6. Receive confirmation email

**Server action:**
```typescript
export async function publicBookAction(formData: FormData) {
  const serviceId = formData.get('serviceId') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const customerName = formData.get('customerName') as string;
  const customerEmail = formData.get('customerEmail') as string;
  const customerPhone = formData.get('customerPhone') as string;
  
  // Get service and organization
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { organization: true }
  });
  
  if (!service) throw new Error('Service not found');
  
  // Create or find customer user
  let user = await prisma.user.findUnique({
    where: { email: customerEmail }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        role: 'CUSTOMER'
      }
    });
  }
  
  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      organizationId: service.organizationId,
      customerId: user.id,
      scheduledAt: new Date(`${date}T${time}`),
      startTime: time,
      endTime: calculateEndTime(time, service.duration),
      status: 'PENDING',
      services: {
        create: {
          serviceId: service.id,
          price: service.priceCents,
          duration: service.duration
        }
      }
    }
  });
  
  // TODO: Send confirmation email
  revalidatePath(`/book/${serviceId}`);
  redirect(`/book/confirmation/${appointment.id}`);
}
```

### Manila Area Data

**New file:** `lib/areas.ts`

```typescript
export const MANILA_AREAS = [
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
  { name: 'Marikina', region: 'Metro Manila' },
];

export function getAreaDistance(area1: string, area2: string): number {
  // Simple distance matrix or use Google Maps API
  // Return distance in km
}
```

### Testing Checklist

- [ ] Can browse categories without login
- [ ] Can search availability
- [ ] Can filter by area
- [ ] Can book appointment as guest
- [ ] Confirmation email sent
- [ ] Appointment appears in org dashboard
- [ ] E2E tests for public booking

---

## Phase 4: Monetization & Polish (Weeks 7-8)

### Goals
- Add Stripe subscription billing
- Implement plan limits (locations, appointments)
- Add rate limiting and security headers
- Performance optimization
- Documentation

### 1. Stripe Integration

**Install:**
```bash
npm install stripe @types/stripe
```

**New models:**
```prisma
model Subscription {
  id             String   @id @default(cuid())
  organizationId String   @unique
  stripeCustomerId String
  stripeSubscriptionId String?
  plan           SubscriptionPlan @default(FREE)
  status         SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

enum SubscriptionPlan {
  FREE       // 1 location, 50 appointments/month
  BASIC      // 3 locations, 200 appointments/month
  PRO        // Unlimited locations, 1000 appointments/month
  ENTERPRISE // Custom limits
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  PAST_DUE
  CANCELLED
}
```

**Stripe webhooks:**
```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // Update Subscription model
      break;
    case 'customer.subscription.deleted':
      // Downgrade to FREE
      break;
  }
  
  return new Response('OK');
}
```

### 2. Rate Limiting

**Install:**
```bash
npm install rate-limiter-flexible
```

**Middleware update:**
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const authLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60, // per 60 seconds
});

export async function middleware(request: Request) {
  const { nextUrl } = request;
  
  // Rate limit auth endpoints
  if (nextUrl.pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    try {
      await authLimiter.consume(ip);
    } catch {
      return new NextResponse('Too many requests', { status: 429 });
    }
  }
  
  // ... existing middleware logic
}
```

### 3. Security Headers

**next.config.ts:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    }
  ]
};

export default nextConfig;
```

### 4. Performance Optimization

#### Add caching to catalog queries
```typescript
import { unstable_cache } from 'next/cache';

export const listServices = unstable_cache(
  async (organizationId: string) => {
    return prisma.service.findMany({
      where: { organizationId, isActive: true }
    });
  },
  ['services', organizationId],
  { revalidate: 3600 } // 1 hour
);
```

#### Add pagination to appointment lists
```typescript
export async function listAppointments(
  organizationId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId },
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' }
    }),
    prisma.appointment.count({
      where: { organizationId }
    })
  ]);
  
  return { appointments, total, pages: Math.ceil(total / limit) };
}
```

### 5. Documentation

**New file:** `docs/SAAS_MIGRATION.md`

- Architecture overview
- Multi-tenancy model
- API documentation
- Deployment guide
- Troubleshooting

**New file:** `docs/ORGANIZATION_SETUP.md`

- Creating organization
- Inviting members
- Configuring settings
- Managing subscription

---

## Migration Checklist

### Phase 1: Multi-Tenant Foundation
- [ ] Add Organization, OrganizationMember, OrganizationSettings models
- [ ] Add organizationId to Staff, Service, Appointment
- [ ] Create migration file
- [ ] Seed default organization
- [ ] Update all catalog queries
- [ ] Update all booking logic
- [ ] Update all server actions
- [ ] Run E2E tests
- [ ] Run verify scripts

### Phase 2: Organization Management
- [ ] Create organization creation form
- [ ] Implement organization switcher
- [ ] Add member invitation system
- [ ] Create organization settings page
- [ ] Add middleware for org context
- [ ] Update dashboard navigation
- [ ] Test multi-org flows

### Phase 3: Public Marketplace
- [ ] Create public homepage
- [ ] Add category browse page
- [ ] Add service detail page
- [ ] Implement availability search API
- [ ] Create public booking flow
- [ ] Add guest checkout
- [ ] Send confirmation emails
- [ ] Add Manila area filtering
- [ ] Test public booking E2E

### Phase 4: Monetization & Polish
- [ ] Add Stripe integration
- [ ] Create subscription plans
- [ ] Implement plan limits
- [ ] Add rate limiting
- [ ] Add security headers
- [ ] Optimize queries with caching
- [ ] Add pagination
- [ ] Write documentation
- [ ] Performance testing
- [ ] Security audit

---

## Success Metrics

### Technical
- API response time < 200ms
- Database queries < 100ms
- Test coverage > 80%
- Lighthouse score > 90

### Business
- 10+ organizations onboarded
- 100+ monthly bookings
- 5%+ conversion rate
- ₱50,000+ MRR

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Backup, test migration on staging, dual-write |
| Tenant data leakage | High | Medium | Strict filtering, code review, E2E tests |
| Performance degradation | Medium | Medium | Indexes, caching, monitoring |
| Low adoption | Medium | Medium | Free tier, demos, marketing |
| Stripe integration issues | High | Low | Test mode, webhooks logging, manual fallback |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up staging environment** for testing
3. **Create Phase 1 branch**
4. **Start with database migration**
5. **Test thoroughly** before moving to Phase 2

Good luck! 🚀
