-- AlterEnum
ALTER TYPE "NotificationDeliveryStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "NotificationDelivery" ADD COLUMN     "claimExpiresAt" TIMESTAMP(3),
ADD COLUMN     "claimToken" TEXT;

-- CreateIndex
CREATE INDEX "NotificationDelivery_claimExpiresAt_idx" ON "NotificationDelivery"("claimExpiresAt");
