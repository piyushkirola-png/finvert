/*
  Warnings:

  - You are about to drop the `chargeback_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chargebacks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `csv_exports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currency_rates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `faqs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_failure_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_merchant_mappings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_pricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_rates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_stats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateways` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inbound_webhooks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `maintenance_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchant_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchant_gateway_priorities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchant_rates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchant_routing_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `outbound_webhooks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_in_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_in_wallet_summaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_in_wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_out_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_out_wallet_summaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pay_out_wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `queues` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refund_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refunds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `risk_blocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settlements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticket_replies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BulkUploadStatus" AS ENUM ('COMPLETED', 'PROCESSING', 'PENDING', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('COMPLETED', 'PROCESSING', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "CardNetwork" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'MAESTRO', 'UNIONPAY', 'JCB', 'DISCOVER', 'OTHER', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "WebhookEventType" ADD VALUE 'BULK_UPLOAD_COMPLETED';

-- AlterEnum
ALTER TYPE "WebhookStatus" ADD VALUE 'SENT';

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "chargeback_logs" DROP CONSTRAINT "chargeback_logs_chargebackId_fkey";

-- DropForeignKey
ALTER TABLE "chargebacks" DROP CONSTRAINT "chargebacks_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "chargebacks" DROP CONSTRAINT "chargebacks_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "chargebacks" DROP CONSTRAINT "chargebacks_payInRequestId_fkey";

-- DropForeignKey
ALTER TABLE "chargebacks" DROP CONSTRAINT "chargebacks_walletCreditTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "chargebacks" DROP CONSTRAINT "chargebacks_walletDebitTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "csv_exports" DROP CONSTRAINT "csv_exports_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "csv_exports" DROP CONSTRAINT "csv_exports_userId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_failure_logs" DROP CONSTRAINT "gateway_failure_logs_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_failure_logs" DROP CONSTRAINT "gateway_failure_logs_payInRequestId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_merchant_mappings" DROP CONSTRAINT "gateway_merchant_mappings_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_merchant_mappings" DROP CONSTRAINT "gateway_merchant_mappings_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_pricing" DROP CONSTRAINT "gateway_pricing_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_rates" DROP CONSTRAINT "gateway_rates_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_stats" DROP CONSTRAINT "gateway_stats_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "inbound_webhooks" DROP CONSTRAINT "inbound_webhooks_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "inbound_webhooks" DROP CONSTRAINT "inbound_webhooks_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_documents" DROP CONSTRAINT "merchant_documents_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_gateway_priorities" DROP CONSTRAINT "merchant_gateway_priorities_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_gateway_priorities" DROP CONSTRAINT "merchant_gateway_priorities_merchantRoutingPrefId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_rates" DROP CONSTRAINT "merchant_rates_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_rates" DROP CONSTRAINT "merchant_rates_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_routing_preferences" DROP CONSTRAINT "merchant_routing_preferences_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "outbound_webhooks" DROP CONSTRAINT "outbound_webhooks_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "outbound_webhooks" DROP CONSTRAINT "outbound_webhooks_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_requests" DROP CONSTRAINT "pay_in_requests_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_requests" DROP CONSTRAINT "pay_in_requests_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_requests" DROP CONSTRAINT "pay_in_requests_payInWalletTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_requests" DROP CONSTRAINT "pay_in_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_wallet_summaries" DROP CONSTRAINT "pay_in_wallet_summaries_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_wallet_summaries" DROP CONSTRAINT "pay_in_wallet_summaries_userId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_wallets" DROP CONSTRAINT "pay_in_wallets_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_in_wallets" DROP CONSTRAINT "pay_in_wallets_userId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_requests" DROP CONSTRAINT "pay_out_requests_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_requests" DROP CONSTRAINT "pay_out_requests_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_requests" DROP CONSTRAINT "pay_out_requests_payOutWalletTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_requests" DROP CONSTRAINT "pay_out_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_wallet_summaries" DROP CONSTRAINT "pay_out_wallet_summaries_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_wallet_summaries" DROP CONSTRAINT "pay_out_wallet_summaries_userId_fkey";

-- DropForeignKey
ALTER TABLE "pay_out_wallets" DROP CONSTRAINT "pay_out_wallets_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "refund_logs" DROP CONSTRAINT "refund_logs_refundId_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_payInRequestId_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_walletDebitTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "risk_blocks" DROP CONSTRAINT "risk_blocks_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_replies" DROP CONSTRAINT "ticket_replies_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_replies" DROP CONSTRAINT "ticket_replies_userId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultCurrency" TEXT NOT NULL DEFAULT 'USD';

-- DropTable
DROP TABLE "chargeback_logs";

-- DropTable
DROP TABLE "chargebacks";

-- DropTable
DROP TABLE "csv_exports";

-- DropTable
DROP TABLE "currency_rates";

-- DropTable
DROP TABLE "faqs";

-- DropTable
DROP TABLE "gateway_failure_logs";

-- DropTable
DROP TABLE "gateway_merchant_mappings";

-- DropTable
DROP TABLE "gateway_pricing";

-- DropTable
DROP TABLE "gateway_rates";

-- DropTable
DROP TABLE "gateway_stats";

-- DropTable
DROP TABLE "gateways";

-- DropTable
DROP TABLE "inbound_webhooks";

-- DropTable
DROP TABLE "maintenance_records";

-- DropTable
DROP TABLE "merchant_documents";

-- DropTable
DROP TABLE "merchant_gateway_priorities";

-- DropTable
DROP TABLE "merchant_rates";

-- DropTable
DROP TABLE "merchant_routing_preferences";

-- DropTable
DROP TABLE "merchants";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "outbound_webhooks";

-- DropTable
DROP TABLE "pay_in_requests";

-- DropTable
DROP TABLE "pay_in_wallet_summaries";

-- DropTable
DROP TABLE "pay_in_wallets";

-- DropTable
DROP TABLE "pay_out_requests";

-- DropTable
DROP TABLE "pay_out_wallet_summaries";

-- DropTable
DROP TABLE "pay_out_wallets";

-- DropTable
DROP TABLE "queues";

-- DropTable
DROP TABLE "refund_logs";

-- DropTable
DROP TABLE "refunds";

-- DropTable
DROP TABLE "risk_blocks";

-- DropTable
DROP TABLE "settlements";

-- DropTable
DROP TABLE "ticket_replies";

-- DropTable
DROP TABLE "tickets";

-- CreateTable
CREATE TABLE "Gateway" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" "GatewayServiceType" NOT NULL DEFAULT 'PAY_IN',
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayRate" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'FIXED',
    "rateValue" DOUBLE PRECISION NOT NULL,
    "rateMinAmount" DOUBLE PRECISION NOT NULL,
    "rateMaxAmount" DOUBLE PRECISION NOT NULL,
    "rateDirection" "RateDirection" NOT NULL DEFAULT 'PAY_IN',
    "taxRate" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "GatewayRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayMerchantMapping" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayMerchantMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayStats" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "successfulRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSuccessTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTransactionValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCharges" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "averageMDR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayPricing" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "rateType" "RateType" NOT NULL DEFAULT 'PERCENTAGE',
    "rateValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "rateDirection" "RateDirection" NOT NULL DEFAULT 'PAY_IN',
    "taxRate" DECIMAL(5,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayFailureLog" (
    "id" SERIAL NOT NULL,
    "payInRequestId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "failureReason" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayFailureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "secretKey" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "callbackUrl" TEXT,
    "redirectUrl" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "onboardingToken" TEXT,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payInLien" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payOutLien" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "businessName" TEXT,
    "businessType" TEXT,
    "websiteUrl" TEXT,
    "gstin" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "settlementCurrency" TEXT DEFAULT 'USD',
    "paymentMethods" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "planType" TEXT NOT NULL DEFAULT 'BASIC',
    "bulkUploadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantDocument" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "customName" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantRate" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'FIXED',
    "rateDirection" "RateDirection" NOT NULL DEFAULT 'PAY_IN',
    "rateValue" DECIMAL(15,2) NOT NULL,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "taxRate" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantRoutingPreference" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "routingStrategy" TEXT NOT NULL DEFAULT 'PRIORITY',
    "preferredGatewayId" INTEGER,
    "loadBalancingConfig" JSONB,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "restrictedGateways" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRoutingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantGatewayPriority" (
    "id" SERIAL NOT NULL,
    "merchantRoutingPrefId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "paymentModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enableFailover" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantGatewayPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayInRequest" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayInRequestStatus" NOT NULL DEFAULT 'PENDING',
    "merchantReference" TEXT NOT NULL,
    "gatewayReference" TEXT,
    "cardNetwork" "CardNetwork" NOT NULL DEFAULT 'UNKNOWN',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerPincode" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "gatewayRate" DECIMAL(15,2),
    "merchantRate" DECIMAL(15,2),
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(15,2),
    "feeType" "RateType",
    "feeRate" DECIMAL(15,2),
    "feeAmount" DECIMAL(15,2),
    "amountToCredit" DECIMAL(15,2),
    "amountInINR" DECIMAL(15,2),
    "fxRate" DECIMAL(15,6),
    "gatewayAmount" DECIMAL(15,2),
    "platformProfit" DECIMAL(15,2),
    "payInWalletTransactionId" INTEGER,
    "failureReason" TEXT,
    "failureCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "intent" TEXT,
    "url" TEXT,
    "paymentMode" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "geolocation" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "requestLog" JSONB,
    "responseLog" JSONB,
    "callbackLog" JSONB,
    "callbackNeeded" BOOLEAN NOT NULL DEFAULT true,
    "callbackReceived" BOOLEAN NOT NULL DEFAULT false,
    "callbackResponse" JSONB,
    "callbackReceivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayInRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayInWallet" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "transactionId" TEXT,
    "referenceId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayInWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayInWalletSummary" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "totalInToday" DECIMAL(15,2) NOT NULL,
    "totalInThisWeek" DECIMAL(15,2) NOT NULL,
    "totalInThisMonth" DECIMAL(15,2) NOT NULL,
    "totalInThisYear" DECIMAL(15,2) NOT NULL,
    "successfulPayIns" INTEGER NOT NULL,
    "failedPayIns" INTEGER NOT NULL,
    "pendingPayIns" INTEGER NOT NULL,
    "totalPayIns" INTEGER NOT NULL,
    "netChargesToday" DECIMAL(15,2) NOT NULL,
    "netChargesThisWeek" DECIMAL(15,2) NOT NULL,
    "netChargesThisMonth" DECIMAL(15,2) NOT NULL,
    "netChargesThisYear" DECIMAL(15,2) NOT NULL,
    "lastTransactionProcessed" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayInWalletSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayOutRequest" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "PayOutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "merchantReference" TEXT NOT NULL,
    "gatewayReference" TEXT,
    "beneficiaryName" TEXT,
    "beneficiaryAccount" TEXT,
    "beneficiaryBank" TEXT,
    "beneficiaryIfsc" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "gatewayRate" DECIMAL(15,2),
    "merchantRate" DECIMAL(15,2),
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(15,2),
    "feeType" "RateType",
    "feeRate" DECIMAL(15,2),
    "feeAmount" DECIMAL(15,2),
    "amountToDebit" DECIMAL(15,2),
    "gatewayAmount" DECIMAL(15,2),
    "platformProfit" DECIMAL(15,2),
    "payOutWalletTransactionId" INTEGER,
    "failureReason" TEXT,
    "failureCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "geolocation" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "requestLog" JSONB,
    "responseLog" JSONB,
    "callbackLog" JSONB,
    "callbackNeeded" BOOLEAN NOT NULL DEFAULT true,
    "callbackReceived" BOOLEAN NOT NULL DEFAULT false,
    "callbackResponse" JSONB,
    "callbackReceivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayOutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayOutWallet" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "transactionId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayOutWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayOutWalletSummary" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "totalOutToday" DECIMAL(15,2) NOT NULL,
    "totalOutThisWeek" DECIMAL(15,2) NOT NULL,
    "totalOutThisMonth" DECIMAL(15,2) NOT NULL,
    "totalOutThisYear" DECIMAL(15,2) NOT NULL,
    "successfulPayOuts" INTEGER NOT NULL,
    "failedPayOuts" INTEGER NOT NULL,
    "pendingPayOuts" INTEGER NOT NULL,
    "totalPayOuts" INTEGER NOT NULL,
    "netChargesToday" DECIMAL(15,2) NOT NULL,
    "netChargesThisWeek" DECIMAL(15,2) NOT NULL,
    "netChargesThisMonth" DECIMAL(15,2) NOT NULL,
    "netChargesThisYear" DECIMAL(15,2) NOT NULL,
    "lastTransactionProcessed" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayOutWalletSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" SERIAL NOT NULL,
    "payInRequestId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "refundType" "RefundType" NOT NULL DEFAULT 'FULL',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "gatewayId" INTEGER NOT NULL,
    "gatewayRefundId" TEXT,
    "refundFee" DECIMAL(15,2),
    "adjustmentAmount" DECIMAL(15,2),
    "walletDebitTransactionId" INTEGER,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "failureCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundLog" (
    "id" SERIAL NOT NULL,
    "refundId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "statusBefore" "RefundStatus",
    "statusAfter" "RefundStatus",
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" SERIAL NOT NULL,
    "payInRequestId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "ChargebackStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "ChargebackReason",
    "reasonDescription" TEXT,
    "gatewayId" INTEGER NOT NULL,
    "gatewayChargebackId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "disputeOpenedAt" TIMESTAMP(3),
    "disputeClosedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputeEvidence" JSONB,
    "chargebackFee" DECIMAL(15,2),
    "merchantLiability" DECIMAL(15,2),
    "recoveredAmount" DECIMAL(15,2),
    "walletDebitTransactionId" INTEGER,
    "walletCreditTransactionId" INTEGER,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargebackLog" (
    "id" SERIAL NOT NULL,
    "chargebackId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "statusBefore" "ChargebackStatus",
    "statusAfter" "ChargebackStatus",
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChargebackLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "approvalStatus" "SettlementApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "sourceWalletBalanceBefore" DECIMAL(15,2),
    "sourceWalletBalanceAfter" DECIMAL(15,2),
    "destinationWalletBalanceBefore" DECIMAL(15,2),
    "destinationWalletBalanceAfter" DECIMAL(15,2),
    "sourceWalletDebitTransactionId" INTEGER,
    "destinationWalletCreditTransactionId" INTEGER,
    "fee" DECIMAL(15,2),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "approvedBy" INTEGER,
    "rejectedBy" INTEGER,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundLog" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT,
    "gatewayId" INTEGER,
    "merchantId" INTEGER,
    "eventType" "WebhookEventType",
    "processedAt" TIMESTAMP(3),
    "requestBody" JSONB,
    "requestHeaders" JSONB,
    "responseBody" JSONB,
    "responseHeaders" JSONB,
    "status" "WebhookStatus",
    "responseStatus" INTEGER,
    "utr" TEXT,
    "amount" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundLog" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "gatewayId" INTEGER,
    "eventType" "WebhookEventType" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "requestBody" JSONB,
    "requestHeaders" JSONB,
    "responseBody" JSONB,
    "responseHeaders" JSONB,
    "status" "WebhookStatus" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "responseStatus" INTEGER,
    "utr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvExport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchantId" INTEGER,
    "exportType" "ExportType" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB,
    "sorts" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" SERIAL NOT NULL,
    "userReferenceId" TEXT NOT NULL,
    "bankReferenceId" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "retryCount" INTEGER NOT NULL,
    "maxRetryLimit" INTEGER,
    "nextCheckAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceModeRecord" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "plannedEnd" TIMESTAMP(3),
    "notification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceModeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" SERIAL NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'INR',
    "rate" DECIMAL(15,6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'API',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskBlock" (
    "id" SERIAL NOT NULL,
    "type" "RiskBlockType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "ticketId" INTEGER,
    "chargebackId" INTEGER,
    "refundId" INTEGER,
    "settlementId" INTEGER,
    "merchantId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "userId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkUpload" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkUploadStatus" NOT NULL DEFAULT 'PENDING',
    "mode" TEXT NOT NULL DEFAULT 'instant',
    "type" TEXT NOT NULL,
    "errorReport" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "bulkUploadId" INTEGER NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GatewayStats_gatewayId_key" ON "GatewayStats"("gatewayId");

-- CreateIndex
CREATE INDEX "GatewayPricing_gatewayId_idx" ON "GatewayPricing"("gatewayId");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayPricing_gatewayId_currency_paymentMode_rateType_rate_key" ON "GatewayPricing"("gatewayId", "currency", "paymentMode", "rateType", "rateDirection");

-- CreateIndex
CREATE INDEX "GatewayFailureLog_payInRequestId_idx" ON "GatewayFailureLog"("payInRequestId");

-- CreateIndex
CREATE INDEX "GatewayFailureLog_gatewayId_idx" ON "GatewayFailureLog"("gatewayId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_secretKey_key" ON "Merchant"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_onboardingToken_key" ON "Merchant"("onboardingToken");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantDocument_merchantId_type_customName_key" ON "MerchantDocument"("merchantId", "type", "customName");

-- CreateIndex
CREATE INDEX "MerchantRate_merchantId_idx" ON "MerchantRate"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantRate_gatewayId_idx" ON "MerchantRate"("gatewayId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantRoutingPreference_merchantId_key" ON "MerchantRoutingPreference"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantGatewayPriority_merchantRoutingPrefId_idx" ON "MerchantGatewayPriority"("merchantRoutingPrefId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantGatewayPriority_merchantRoutingPrefId_priority_key" ON "MerchantGatewayPriority"("merchantRoutingPrefId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "PayInRequest_merchantReference_key" ON "PayInRequest"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PayInRequest_payInWalletTransactionId_key" ON "PayInRequest"("payInWalletTransactionId");

-- CreateIndex
CREATE INDEX "PayInRequest_merchantId_idx" ON "PayInRequest"("merchantId");

-- CreateIndex
CREATE INDEX "PayInRequest_gatewayId_idx" ON "PayInRequest"("gatewayId");

-- CreateIndex
CREATE INDEX "PayInRequest_status_idx" ON "PayInRequest"("status");

-- CreateIndex
CREATE INDEX "PayInRequest_requestedAt_idx" ON "PayInRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "PayInRequest_merchantReference_idx" ON "PayInRequest"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PayInWallet_transactionId_key" ON "PayInWallet"("transactionId");

-- CreateIndex
CREATE INDEX "PayInWallet_merchantId_idx" ON "PayInWallet"("merchantId");

-- CreateIndex
CREATE INDEX "PayInWallet_userId_idx" ON "PayInWallet"("userId");

-- CreateIndex
CREATE INDEX "PayInWallet_transactionId_idx" ON "PayInWallet"("transactionId");

-- CreateIndex
CREATE INDEX "PayInWallet_referenceId_idx" ON "PayInWallet"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PayInWalletSummary_merchantId_userId_key" ON "PayInWalletSummary"("merchantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayOutRequest_merchantReference_key" ON "PayOutRequest"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PayOutRequest_payOutWalletTransactionId_key" ON "PayOutRequest"("payOutWalletTransactionId");

-- CreateIndex
CREATE INDEX "PayOutRequest_merchantId_idx" ON "PayOutRequest"("merchantId");

-- CreateIndex
CREATE INDEX "PayOutRequest_gatewayId_idx" ON "PayOutRequest"("gatewayId");

-- CreateIndex
CREATE INDEX "PayOutRequest_status_idx" ON "PayOutRequest"("status");

-- CreateIndex
CREATE INDEX "PayOutRequest_requestedAt_idx" ON "PayOutRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "PayOutRequest_merchantReference_idx" ON "PayOutRequest"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PayOutWallet_transactionId_key" ON "PayOutWallet"("transactionId");

-- CreateIndex
CREATE INDEX "PayOutWallet_merchantId_idx" ON "PayOutWallet"("merchantId");

-- CreateIndex
CREATE INDEX "PayOutWallet_userId_idx" ON "PayOutWallet"("userId");

-- CreateIndex
CREATE INDEX "PayOutWallet_transactionId_idx" ON "PayOutWallet"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayOutWalletSummary_merchantId_userId_key" ON "PayOutWalletSummary"("merchantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_gatewayRefundId_key" ON "Refund"("gatewayRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_walletDebitTransactionId_key" ON "Refund"("walletDebitTransactionId");

-- CreateIndex
CREATE INDEX "Refund_payInRequestId_idx" ON "Refund"("payInRequestId");

-- CreateIndex
CREATE INDEX "Refund_merchantId_idx" ON "Refund"("merchantId");

-- CreateIndex
CREATE INDEX "Refund_gatewayId_idx" ON "Refund"("gatewayId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

-- CreateIndex
CREATE INDEX "RefundLog_refundId_idx" ON "RefundLog"("refundId");

-- CreateIndex
CREATE INDEX "RefundLog_createdAt_idx" ON "RefundLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chargeback_payInRequestId_key" ON "Chargeback"("payInRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Chargeback_gatewayChargebackId_key" ON "Chargeback"("gatewayChargebackId");

-- CreateIndex
CREATE UNIQUE INDEX "Chargeback_walletDebitTransactionId_key" ON "Chargeback"("walletDebitTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Chargeback_walletCreditTransactionId_key" ON "Chargeback"("walletCreditTransactionId");

-- CreateIndex
CREATE INDEX "Chargeback_payInRequestId_idx" ON "Chargeback"("payInRequestId");

-- CreateIndex
CREATE INDEX "Chargeback_merchantId_idx" ON "Chargeback"("merchantId");

-- CreateIndex
CREATE INDEX "Chargeback_gatewayId_idx" ON "Chargeback"("gatewayId");

-- CreateIndex
CREATE INDEX "Chargeback_status_idx" ON "Chargeback"("status");

-- CreateIndex
CREATE INDEX "Chargeback_initiatedAt_idx" ON "Chargeback"("initiatedAt");

-- CreateIndex
CREATE INDEX "Chargeback_resolvedAt_idx" ON "Chargeback"("resolvedAt");

-- CreateIndex
CREATE INDEX "Chargeback_createdAt_idx" ON "Chargeback"("createdAt");

-- CreateIndex
CREATE INDEX "Chargeback_merchantId_status_idx" ON "Chargeback"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Chargeback_initiatedAt_status_idx" ON "Chargeback"("initiatedAt", "status");

-- CreateIndex
CREATE INDEX "ChargebackLog_chargebackId_idx" ON "ChargebackLog"("chargebackId");

-- CreateIndex
CREATE INDEX "ChargebackLog_createdAt_idx" ON "ChargebackLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChargebackLog_action_idx" ON "ChargebackLog"("action");

-- CreateIndex
CREATE INDEX "Settlement_merchantId_idx" ON "Settlement"("merchantId");

-- CreateIndex
CREATE INDEX "InboundLog_gatewayId_idx" ON "InboundLog"("gatewayId");

-- CreateIndex
CREATE INDEX "InboundLog_merchantId_idx" ON "InboundLog"("merchantId");

-- CreateIndex
CREATE INDEX "InboundLog_createdAt_idx" ON "InboundLog"("createdAt");

-- CreateIndex
CREATE INDEX "OutboundLog_merchantId_idx" ON "OutboundLog"("merchantId");

-- CreateIndex
CREATE INDEX "OutboundLog_gatewayId_idx" ON "OutboundLog"("gatewayId");

-- CreateIndex
CREATE INDEX "OutboundLog_createdAt_idx" ON "OutboundLog"("createdAt");

-- CreateIndex
CREATE INDEX "CsvExport_userId_idx" ON "CsvExport"("userId");

-- CreateIndex
CREATE INDEX "CsvExport_merchantId_idx" ON "CsvExport"("merchantId");

-- CreateIndex
CREATE INDEX "CsvExport_status_idx" ON "CsvExport"("status");

-- CreateIndex
CREATE INDEX "CsvExport_exportType_idx" ON "CsvExport"("exportType");

-- CreateIndex
CREATE INDEX "CsvExport_createdAt_idx" ON "CsvExport"("createdAt");

-- CreateIndex
CREATE INDEX "CurrencyRate_baseCurrency_idx" ON "CurrencyRate"("baseCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_baseCurrency_quoteCurrency_key" ON "CurrencyRate"("baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE INDEX "RiskBlock_type_value_idx" ON "RiskBlock"("type", "value");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_ticketId_idx" ON "Notification"("ticketId");

-- CreateIndex
CREATE INDEX "FAQ_category_idx" ON "FAQ"("category");

-- CreateIndex
CREATE INDEX "FAQ_isPublished_idx" ON "FAQ"("isPublished");

-- CreateIndex
CREATE INDEX "FAQ_createdAt_idx" ON "FAQ"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_merchantId_idx" ON "Ticket"("merchantId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");

-- CreateIndex
CREATE INDEX "TicketReply_userId_idx" ON "TicketReply"("userId");

-- CreateIndex
CREATE INDEX "TicketReply_createdAt_idx" ON "TicketReply"("createdAt");

-- CreateIndex
CREATE INDEX "BulkUpload_merchantId_status_idx" ON "BulkUpload"("merchantId", "status");

-- CreateIndex
CREATE INDEX "BulkUpload_createdAt_idx" ON "BulkUpload"("createdAt");

-- CreateIndex
CREATE INDEX "BulkUpload_userId_idx" ON "BulkUpload"("userId");

-- CreateIndex
CREATE INDEX "BulkUpload_type_idx" ON "BulkUpload"("type");

-- CreateIndex
CREATE INDEX "BulkUpload_merchantId_createdAt_idx" ON "BulkUpload"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledTask_merchantId_status_idx" ON "ScheduledTask"("merchantId", "status");

-- CreateIndex
CREATE INDEX "ScheduledTask_scheduledTime_idx" ON "ScheduledTask"("scheduledTime");

-- CreateIndex
CREATE INDEX "ScheduledTask_bulkUploadId_idx" ON "ScheduledTask"("bulkUploadId");

-- CreateIndex
CREATE INDEX "ScheduledTask_type_idx" ON "ScheduledTask"("type");

-- AddForeignKey
ALTER TABLE "GatewayRate" ADD CONSTRAINT "GatewayRate_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayMerchantMapping" ADD CONSTRAINT "GatewayMerchantMapping_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayMerchantMapping" ADD CONSTRAINT "GatewayMerchantMapping_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayStats" ADD CONSTRAINT "GatewayStats_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayPricing" ADD CONSTRAINT "GatewayPricing_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayFailureLog" ADD CONSTRAINT "GatewayFailureLog_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayFailureLog" ADD CONSTRAINT "GatewayFailureLog_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "PayInRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDocument" ADD CONSTRAINT "MerchantDocument_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantRate" ADD CONSTRAINT "MerchantRate_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantRate" ADD CONSTRAINT "MerchantRate_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantRoutingPreference" ADD CONSTRAINT "MerchantRoutingPreference_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantGatewayPriority" ADD CONSTRAINT "MerchantGatewayPriority_merchantRoutingPrefId_fkey" FOREIGN KEY ("merchantRoutingPrefId") REFERENCES "MerchantRoutingPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantGatewayPriority" ADD CONSTRAINT "MerchantGatewayPriority_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInRequest" ADD CONSTRAINT "PayInRequest_payInWalletTransactionId_fkey" FOREIGN KEY ("payInWalletTransactionId") REFERENCES "PayInWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInRequest" ADD CONSTRAINT "PayInRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInRequest" ADD CONSTRAINT "PayInRequest_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInRequest" ADD CONSTRAINT "PayInRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInWallet" ADD CONSTRAINT "PayInWallet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInWallet" ADD CONSTRAINT "PayInWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInWalletSummary" ADD CONSTRAINT "PayInWalletSummary_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayInWalletSummary" ADD CONSTRAINT "PayInWalletSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutRequest" ADD CONSTRAINT "PayOutRequest_payOutWalletTransactionId_fkey" FOREIGN KEY ("payOutWalletTransactionId") REFERENCES "PayOutWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutRequest" ADD CONSTRAINT "PayOutRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutRequest" ADD CONSTRAINT "PayOutRequest_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutRequest" ADD CONSTRAINT "PayOutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutWallet" ADD CONSTRAINT "PayOutWallet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutWallet" ADD CONSTRAINT "PayOutWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOutWalletSummary" ADD CONSTRAINT "PayOutWalletSummary_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "PayInRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_walletDebitTransactionId_fkey" FOREIGN KEY ("walletDebitTransactionId") REFERENCES "PayInWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundLog" ADD CONSTRAINT "RefundLog_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "PayInRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_walletDebitTransactionId_fkey" FOREIGN KEY ("walletDebitTransactionId") REFERENCES "PayInWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_walletCreditTransactionId_fkey" FOREIGN KEY ("walletCreditTransactionId") REFERENCES "PayInWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargebackLog" ADD CONSTRAINT "ChargebackLog_chargebackId_fkey" FOREIGN KEY ("chargebackId") REFERENCES "Chargeback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundLog" ADD CONSTRAINT "InboundLog_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundLog" ADD CONSTRAINT "InboundLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundLog" ADD CONSTRAINT "OutboundLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundLog" ADD CONSTRAINT "OutboundLog_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvExport" ADD CONSTRAINT "CsvExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvExport" ADD CONSTRAINT "CsvExport_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskBlock" ADD CONSTRAINT "RiskBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkUpload" ADD CONSTRAINT "BulkUpload_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkUpload" ADD CONSTRAINT "BulkUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_bulkUploadId_fkey" FOREIGN KEY ("bulkUploadId") REFERENCES "BulkUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
