-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "area" TEXT;

-- CreateIndex
CREATE INDEX "Location_area_idx" ON "Location"("area");
