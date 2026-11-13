export interface Merchant {
  id: number;
  merchantName: string;
  email: string;
  phone: string;
  planType?: string;
  bulkUploadEnabled?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  businessName?: string;
  businessType?: string;
  websiteUrl?: string;
  gstin?: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE" | "REJECTED";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  settlementCurrency?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentMethods?: string[];
  users?: MerchantUser[];
  ipWhitelist?: string[];
}

export interface MerchantUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface MerchantStats {
  totalMerchants: number;
  activeMerchants: number;
  pendingMerchants: number;
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

export interface MerchantRate {
  id: number;
  merchantId: number;
  gatewayId: number;
  rateType: "FIXED" | "PERCENTAGE";
  rateDirection: "PAY_IN" | "PAY_OUT";
  rateValue: number;
  minAmount: number;
  maxAmount: number;
  taxRate: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  gateway?: { id: number; name: string; gateway_name: string };
}

export interface MerchantRegistrationData {
  merchantName: string;
  email: string;
  phone: string;
  webhookUrl?: string;
  webhookSecret?: string;
  websiteUrl?: string;
  businessName: string;
  businessType: string;
  gstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  settlementCurrency: string;
}
