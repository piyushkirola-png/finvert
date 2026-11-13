/*
  Warnings:

  - You are about to drop the column `userId` on the `Merchant` table. All the data in the column will be lost.
  - Made the column `lastRefreshedAt` on table `PayOutWalletSummary` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskBlockType" ADD VALUE 'VPA';
ALTER TYPE "RiskBlockType" ADD VALUE 'IP_ADDRESS';
ALTER TYPE "RiskBlockType" ADD VALUE 'DEVICE_ID';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "changes" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "merchantId" INTEGER,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "PayOutRequest" ADD COLUMN     "paymentMode" TEXT DEFAULT 'BANK';

-- AlterTable
ALTER TABLE "PayOutWallet" ADD COLUMN     "referenceId" TEXT;

-- AlterTable
ALTER TABLE "PayOutWalletSummary" ALTER COLUMN "lastRefreshedAt" SET NOT NULL,
ALTER COLUMN "lastRefreshedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_merchantId_idx" ON "AuditLog"("merchantId");

-- CreateIndex
CREATE INDEX "AuditLog_status_idx" ON "AuditLog"("status");

-- CreateIndex
CREATE INDEX "PayInRequest_merchantId_status_idx" ON "PayInRequest"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PayInRequest_createdAt_idx" ON "PayInRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PayInWallet_merchantId_userId_createdAt_idx" ON "PayInWallet"("merchantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "PayOutWallet_referenceId_idx" ON "PayOutWallet"("referenceId");

-- CreateIndex
CREATE INDEX "Settlement_userId_idx" ON "Settlement"("userId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutWalletSummary" ADD CONSTRAINT "PayOutWalletSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
