-- AlterTable: Add nullable contact snapshot columns to Appointment (Foundation A1)
ALTER TABLE "Appointment" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "customerEmail" TEXT;
