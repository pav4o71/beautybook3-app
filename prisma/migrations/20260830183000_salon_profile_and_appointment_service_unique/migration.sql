-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "description" TEXT;
ALTER TABLE "Organization" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "phone" TEXT;

-- Keep the lowest id when the same service was attached twice to one appointment.
DELETE FROM "AppointmentService" AS a
USING "AppointmentService" AS b
WHERE a."appointmentId" = b."appointmentId"
  AND a."serviceId" = b."serviceId"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentService_appointmentId_serviceId_key" ON "AppointmentService"("appointmentId", "serviceId");
