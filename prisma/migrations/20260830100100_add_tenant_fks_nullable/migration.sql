-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "organizationId" TEXT,
ADD COLUMN "locationId" TEXT;

-- AlterTable
ALTER TABLE "StaffSchedule" ADD COLUMN "organizationId" TEXT,
ADD COLUMN "locationId" TEXT;

-- AlterTable
ALTER TABLE "TimeOff" ADD COLUMN "organizationId" TEXT,
ADD COLUMN "locationId" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "organizationId" TEXT,
ADD COLUMN "locationId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceCategory_organizationId_idx" ON "ServiceCategory"("organizationId");

-- CreateIndex
CREATE INDEX "Service_organizationId_active_idx" ON "Service"("organizationId", "active");

-- CreateIndex
CREATE INDEX "Staff_organizationId_active_idx" ON "Staff"("organizationId", "active");

-- CreateIndex
CREATE INDEX "Staff_locationId_idx" ON "Staff"("locationId");

-- CreateIndex
CREATE INDEX "StaffSchedule_organizationId_idx" ON "StaffSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "StaffSchedule_locationId_idx" ON "StaffSchedule"("locationId");

-- CreateIndex
CREATE INDEX "TimeOff_organizationId_idx" ON "TimeOff"("organizationId");

-- CreateIndex
CREATE INDEX "TimeOff_locationId_idx" ON "TimeOff"("locationId");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_startsAt_idx" ON "Appointment"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_locationId_startsAt_idx" ON "Appointment"("locationId", "startsAt");

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
