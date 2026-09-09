-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "cancelNote" TEXT;
