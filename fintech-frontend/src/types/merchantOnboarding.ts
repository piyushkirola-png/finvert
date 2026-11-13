export interface MerchantOnboardingData {
  businessName: string;
  websiteUrl: string;
  businessType: string;
  gstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  settlementCurrency: string;
  paymentMethods?: string[];
}

export interface MerchantDocument {
  id: number;
  merchantId: number;
  type: string;
  customName?: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantDocumentUpload {
  merchantId: number;
  docType: string;
  customName?: string;
  file: File;
}

export interface MerchantRate {
  id: number;
  merchantId: number;
  gatewayId: number;
  direction: "PAYIN" | "PAYOUT";
  rateType: "FIXED" | "PERCENTAGE";
  rateValue: number;
  minAmount: string;
  maxAmount: string;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  gateway?: { id: number; name: string; gateway_name: string };
}

export interface MerchantRateFormData {
  merchantId: number;
  gatewayId: number;
  direction: "PAYIN" | "PAYOUT";
  rateType: "FIXED" | "PERCENTAGE";
  rateValue: number;
  minAmount: string;
  maxAmount: string;
  taxRate: number;
  isActive: boolean;
}

export interface IPWhitelistData {
  ips: string[];
}

export interface MerchantOnboardingResponse {
  id: number;
  merchantName: string;
  email: string;
  businessName: string;
  websiteUrl: string;
  businessType: string;
  gstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  settlementCurrency: string;
  paymentMethods: string[];
  status: string;
}

export interface Gateway {
  id: number;
  name: string;
  gateway_name: string;
  isActive: boolean;
}

export interface PaymentMethod {
  name: string;
  icon: string;
}
