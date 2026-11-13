-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MERCHANT', 'USER');

-- CreateEnum
CREATE TYPE "PayInRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayOutRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "RateDirection" AS ENUM ('PAY_IN', 'PAY_OUT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('PAY_IN_STATUS_UPDATE', 'PAY_OUT_STATUS_UPDATE', 'SETTLEMENT_COMPLETED', 'CHARGEBACK_CREATED', 'CHARGEBACK_RESOLVED', 'REFUND_CREATED', 'REFUND_COMPLETED');

-- CreateEnum
CREATE TYPE "GatewayServiceType" AS ENUM ('PAY_IN', 'PAY_OUT', 'PAY_IN_PAY_OUT');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('PAYOUT_REQUESTS', 'PAYOUT_WALLETS', 'PAYIN_REQUESTS', 'PAYIN_WALLETS', 'SETTLEMENTS', 'CHARGEBACKS', 'REFUNDS');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SettlementApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISPUTED', 'RESOLVED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChargebackReason" AS ENUM ('FRAUDULENT', 'DUPLICATE', 'PRODUCT_NOT_RECEIVED', 'SERVICE_NOT_PROVIDED', 'UNAUTHORIZED', 'TECHNICAL_ISSUE', 'CUSTOMER_DISPUTE', 'CANCELLED', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RiskBlockType" AS ENUM ('USER_ID', 'MERCHANT_ID', 'EMAIL', 'PHONE_NUMBER', 'CARD_BIN', 'CARD_LAST4');

-- CreateTable
CREATE TABLE "gateways" (
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

    CONSTRAINT "gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_rates" (
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

    CONSTRAINT "gateway_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_merchant_mappings" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_merchant_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_rates" (
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

    CONSTRAINT "merchant_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_in_wallets" (
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

    CONSTRAINT "pay_in_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_in_wallet_summaries" (
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

    CONSTRAINT "pay_in_wallet_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_out_wallets" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "transactionId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_out_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_out_wallet_summaries" (
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

    CONSTRAINT "pay_out_wallet_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_out_requests" (
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

    CONSTRAINT "pay_out_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
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
    "settlementCurrency" TEXT DEFAULT 'INR',
    "paymentMethods" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_documents" (
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

    CONSTRAINT "merchant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "merchantId" INTEGER,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" TEXT,
    "mfaSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_in_requests" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayInRequestStatus" NOT NULL DEFAULT 'PENDING',
    "merchantReference" TEXT NOT NULL,
    "gatewayReference" TEXT,
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

    CONSTRAINT "pay_in_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
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

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_logs" (
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

    CONSTRAINT "refund_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargebacks" (
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

    CONSTRAINT "chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargeback_logs" (
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

    CONSTRAINT "chargeback_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_webhooks" (
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

    CONSTRAINT "inbound_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_webhooks" (
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

    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
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

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_exports" (
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

    CONSTRAINT "csv_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
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

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
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

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_stats" (
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

    CONSTRAINT "gateway_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_pricing" (
    "id" SERIAL NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mdrRate" DECIMAL(5,2) NOT NULL,
    "fixedCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_routing_preferences" (
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

    CONSTRAINT "merchant_routing_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_gateway_priorities" (
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

    CONSTRAINT "merchant_gateway_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_failure_logs" (
    "id" SERIAL NOT NULL,
    "payInRequestId" INTEGER NOT NULL,
    "gatewayId" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "failureReason" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" SERIAL NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'INR',
    "rate" DECIMAL(15,6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'API',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_blocks" (
    "id" SERIAL NOT NULL,
    "type" "RiskBlockType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
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

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
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

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_rates_merchantId_idx" ON "merchant_rates"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_rates_gatewayId_idx" ON "merchant_rates"("gatewayId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_rates_merchantId_gatewayId_rateDirection_key" ON "merchant_rates"("merchantId", "gatewayId", "rateDirection");

-- CreateIndex
CREATE UNIQUE INDEX "pay_in_wallets_transactionId_key" ON "pay_in_wallets"("transactionId");

-- CreateIndex
CREATE INDEX "pay_in_wallets_merchantId_idx" ON "pay_in_wallets"("merchantId");

-- CreateIndex
CREATE INDEX "pay_in_wallets_userId_idx" ON "pay_in_wallets"("userId");

-- CreateIndex
CREATE INDEX "pay_in_wallets_transactionId_idx" ON "pay_in_wallets"("transactionId");

-- CreateIndex
CREATE INDEX "pay_in_wallets_referenceId_idx" ON "pay_in_wallets"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_in_wallet_summaries_merchantId_userId_key" ON "pay_in_wallet_summaries"("merchantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_out_wallets_transactionId_key" ON "pay_out_wallets"("transactionId");

-- CreateIndex
CREATE INDEX "pay_out_wallets_merchantId_idx" ON "pay_out_wallets"("merchantId");

-- CreateIndex
CREATE INDEX "pay_out_wallets_transactionId_idx" ON "pay_out_wallets"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_out_wallet_summaries_merchantId_key" ON "pay_out_wallet_summaries"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_out_requests_merchantReference_key" ON "pay_out_requests"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "pay_out_requests_payOutWalletTransactionId_key" ON "pay_out_requests"("payOutWalletTransactionId");

-- CreateIndex
CREATE INDEX "pay_out_requests_merchantId_idx" ON "pay_out_requests"("merchantId");

-- CreateIndex
CREATE INDEX "pay_out_requests_gatewayId_idx" ON "pay_out_requests"("gatewayId");

-- CreateIndex
CREATE INDEX "pay_out_requests_status_idx" ON "pay_out_requests"("status");

-- CreateIndex
CREATE INDEX "pay_out_requests_requestedAt_idx" ON "pay_out_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "pay_out_requests_merchantReference_idx" ON "pay_out_requests"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_email_key" ON "merchants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_secretKey_key" ON "merchants"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_onboardingToken_key" ON "merchants"("onboardingToken");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_documents_merchantId_type_customName_key" ON "merchant_documents"("merchantId", "type", "customName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_merchantId_idx" ON "User"("merchantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_accessToken_key" ON "UserSession"("accessToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_refreshToken_idx" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "UserSession_accessToken_idx" ON "UserSession"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pay_in_requests_merchantReference_key" ON "pay_in_requests"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "pay_in_requests_payInWalletTransactionId_key" ON "pay_in_requests"("payInWalletTransactionId");

-- CreateIndex
CREATE INDEX "pay_in_requests_merchantId_idx" ON "pay_in_requests"("merchantId");

-- CreateIndex
CREATE INDEX "pay_in_requests_gatewayId_idx" ON "pay_in_requests"("gatewayId");

-- CreateIndex
CREATE INDEX "pay_in_requests_status_idx" ON "pay_in_requests"("status");

-- CreateIndex
CREATE INDEX "pay_in_requests_requestedAt_idx" ON "pay_in_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "pay_in_requests_merchantReference_idx" ON "pay_in_requests"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_gatewayRefundId_key" ON "refunds"("gatewayRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_walletDebitTransactionId_key" ON "refunds"("walletDebitTransactionId");

-- CreateIndex
CREATE INDEX "refunds_payInRequestId_idx" ON "refunds"("payInRequestId");

-- CreateIndex
CREATE INDEX "refunds_merchantId_idx" ON "refunds"("merchantId");

-- CreateIndex
CREATE INDEX "refunds_gatewayId_idx" ON "refunds"("gatewayId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_createdAt_idx" ON "refunds"("createdAt");

-- CreateIndex
CREATE INDEX "refund_logs_refundId_idx" ON "refund_logs"("refundId");

-- CreateIndex
CREATE INDEX "refund_logs_createdAt_idx" ON "refund_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chargebacks_payInRequestId_key" ON "chargebacks"("payInRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "chargebacks_gatewayChargebackId_key" ON "chargebacks"("gatewayChargebackId");

-- CreateIndex
CREATE UNIQUE INDEX "chargebacks_walletDebitTransactionId_key" ON "chargebacks"("walletDebitTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "chargebacks_walletCreditTransactionId_key" ON "chargebacks"("walletCreditTransactionId");

-- CreateIndex
CREATE INDEX "chargebacks_payInRequestId_idx" ON "chargebacks"("payInRequestId");

-- CreateIndex
CREATE INDEX "chargebacks_merchantId_idx" ON "chargebacks"("merchantId");

-- CreateIndex
CREATE INDEX "chargebacks_gatewayId_idx" ON "chargebacks"("gatewayId");

-- CreateIndex
CREATE INDEX "chargebacks_status_idx" ON "chargebacks"("status");

-- CreateIndex
CREATE INDEX "chargebacks_initiatedAt_idx" ON "chargebacks"("initiatedAt");

-- CreateIndex
CREATE INDEX "chargebacks_resolvedAt_idx" ON "chargebacks"("resolvedAt");

-- CreateIndex
CREATE INDEX "chargebacks_createdAt_idx" ON "chargebacks"("createdAt");

-- CreateIndex
CREATE INDEX "chargebacks_merchantId_status_idx" ON "chargebacks"("merchantId", "status");

-- CreateIndex
CREATE INDEX "chargebacks_initiatedAt_status_idx" ON "chargebacks"("initiatedAt", "status");

-- CreateIndex
CREATE INDEX "chargeback_logs_chargebackId_idx" ON "chargeback_logs"("chargebackId");

-- CreateIndex
CREATE INDEX "chargeback_logs_createdAt_idx" ON "chargeback_logs"("createdAt");

-- CreateIndex
CREATE INDEX "chargeback_logs_action_idx" ON "chargeback_logs"("action");

-- CreateIndex
CREATE INDEX "inbound_webhooks_gatewayId_idx" ON "inbound_webhooks"("gatewayId");

-- CreateIndex
CREATE INDEX "inbound_webhooks_merchantId_idx" ON "inbound_webhooks"("merchantId");

-- CreateIndex
CREATE INDEX "inbound_webhooks_createdAt_idx" ON "inbound_webhooks"("createdAt");

-- CreateIndex
CREATE INDEX "outbound_webhooks_merchantId_idx" ON "outbound_webhooks"("merchantId");

-- CreateIndex
CREATE INDEX "outbound_webhooks_gatewayId_idx" ON "outbound_webhooks"("gatewayId");

-- CreateIndex
CREATE INDEX "outbound_webhooks_createdAt_idx" ON "outbound_webhooks"("createdAt");

-- CreateIndex
CREATE INDEX "settlements_merchantId_idx" ON "settlements"("merchantId");

-- CreateIndex
CREATE INDEX "csv_exports_userId_idx" ON "csv_exports"("userId");

-- CreateIndex
CREATE INDEX "csv_exports_merchantId_idx" ON "csv_exports"("merchantId");

-- CreateIndex
CREATE INDEX "csv_exports_status_idx" ON "csv_exports"("status");

-- CreateIndex
CREATE INDEX "csv_exports_exportType_idx" ON "csv_exports"("exportType");

-- CreateIndex
CREATE INDEX "csv_exports_createdAt_idx" ON "csv_exports"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_stats_gatewayId_key" ON "gateway_stats"("gatewayId");

-- CreateIndex
CREATE INDEX "gateway_pricing_gatewayId_idx" ON "gateway_pricing"("gatewayId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_pricing_gatewayId_paymentMode_currency_key" ON "gateway_pricing"("gatewayId", "paymentMode", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_routing_preferences_merchantId_key" ON "merchant_routing_preferences"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_gateway_priorities_merchantRoutingPrefId_idx" ON "merchant_gateway_priorities"("merchantRoutingPrefId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_gateway_priorities_merchantRoutingPrefId_priority_key" ON "merchant_gateway_priorities"("merchantRoutingPrefId", "priority");

-- CreateIndex
CREATE INDEX "gateway_failure_logs_payInRequestId_idx" ON "gateway_failure_logs"("payInRequestId");

-- CreateIndex
CREATE INDEX "gateway_failure_logs_gatewayId_idx" ON "gateway_failure_logs"("gatewayId");

-- CreateIndex
CREATE INDEX "currency_rates_baseCurrency_idx" ON "currency_rates"("baseCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_baseCurrency_quoteCurrency_key" ON "currency_rates"("baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE INDEX "risk_blocks_type_value_idx" ON "risk_blocks"("type", "value");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_ticketId_idx" ON "notifications"("ticketId");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_isPublished_idx" ON "faqs"("isPublished");

-- CreateIndex
CREATE INDEX "faqs_createdAt_idx" ON "faqs"("createdAt");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_merchantId_idx" ON "tickets"("merchantId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_replies_ticketId_idx" ON "ticket_replies"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_replies_userId_idx" ON "ticket_replies"("userId");

-- CreateIndex
CREATE INDEX "ticket_replies_createdAt_idx" ON "ticket_replies"("createdAt");

-- AddForeignKey
ALTER TABLE "gateway_rates" ADD CONSTRAINT "gateway_rates_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_merchant_mappings" ADD CONSTRAINT "gateway_merchant_mappings_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_merchant_mappings" ADD CONSTRAINT "gateway_merchant_mappings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rates" ADD CONSTRAINT "merchant_rates_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rates" ADD CONSTRAINT "merchant_rates_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_wallets" ADD CONSTRAINT "pay_in_wallets_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_wallets" ADD CONSTRAINT "pay_in_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_wallet_summaries" ADD CONSTRAINT "pay_in_wallet_summaries_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_wallet_summaries" ADD CONSTRAINT "pay_in_wallet_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_wallets" ADD CONSTRAINT "pay_out_wallets_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_wallet_summaries" ADD CONSTRAINT "pay_out_wallet_summaries_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_wallet_summaries" ADD CONSTRAINT "pay_out_wallet_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_requests" ADD CONSTRAINT "pay_out_requests_payOutWalletTransactionId_fkey" FOREIGN KEY ("payOutWalletTransactionId") REFERENCES "pay_out_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_requests" ADD CONSTRAINT "pay_out_requests_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_requests" ADD CONSTRAINT "pay_out_requests_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_out_requests" ADD CONSTRAINT "pay_out_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_documents" ADD CONSTRAINT "merchant_documents_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_requests" ADD CONSTRAINT "pay_in_requests_payInWalletTransactionId_fkey" FOREIGN KEY ("payInWalletTransactionId") REFERENCES "pay_in_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_requests" ADD CONSTRAINT "pay_in_requests_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_requests" ADD CONSTRAINT "pay_in_requests_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_in_requests" ADD CONSTRAINT "pay_in_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "pay_in_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_walletDebitTransactionId_fkey" FOREIGN KEY ("walletDebitTransactionId") REFERENCES "pay_in_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_logs" ADD CONSTRAINT "refund_logs_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "pay_in_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_walletDebitTransactionId_fkey" FOREIGN KEY ("walletDebitTransactionId") REFERENCES "pay_in_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_walletCreditTransactionId_fkey" FOREIGN KEY ("walletCreditTransactionId") REFERENCES "pay_in_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargeback_logs" ADD CONSTRAINT "chargeback_logs_chargebackId_fkey" FOREIGN KEY ("chargebackId") REFERENCES "chargebacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_webhooks" ADD CONSTRAINT "inbound_webhooks_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_webhooks" ADD CONSTRAINT "inbound_webhooks_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_stats" ADD CONSTRAINT "gateway_stats_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_pricing" ADD CONSTRAINT "gateway_pricing_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_routing_preferences" ADD CONSTRAINT "merchant_routing_preferences_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_gateway_priorities" ADD CONSTRAINT "merchant_gateway_priorities_merchantRoutingPrefId_fkey" FOREIGN KEY ("merchantRoutingPrefId") REFERENCES "merchant_routing_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_gateway_priorities" ADD CONSTRAINT "merchant_gateway_priorities_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_failure_logs" ADD CONSTRAINT "gateway_failure_logs_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_failure_logs" ADD CONSTRAINT "gateway_failure_logs_payInRequestId_fkey" FOREIGN KEY ("payInRequestId") REFERENCES "pay_in_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_blocks" ADD CONSTRAINT "risk_blocks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
