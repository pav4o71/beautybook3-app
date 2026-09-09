-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "managementTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_managementTokenHash_key" ON "Appointment"("managementTokenHash");
