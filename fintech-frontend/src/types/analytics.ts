export interface TransactionVolumeData {
  dates: string[];
  payin: { success: number[]; pending: number[]; failed: number[] };
  payout: { success: number[]; pending: number[]; failed: number[] };
  refund: number[];
  chargeback: number[];
}

export interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
  type: "payin" | "payout";
}

export interface HourlyVolumeData {
  hours: string[];
  payin: { success: number[]; pending: number[]; failed: number[] };
  payout: { success: number[]; pending: number[]; failed: number[] };
  refund: number[];
  chargeback: number[];
}

export interface GatewayPerformanceData {
  name: string;
  payin: number;
  payout: number;
  refund: number;
  chargeback: number;
}

export interface TransactionCompositionData {
  payin: number;
  payout: number;
  refund: number;
  chargeback: number;
  total: number;
}

export interface MerchantPerformanceData {
  name: string;
  payin: number;
  payout: number;
  refund: number;
  chargeback: number;
}

export interface AnalyticsFilters {
  merchantId?: string;
  gatewayId?: string;
  userId?: string;
  dateRange?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export interface Merchant {
  id: number;
  merchantName: string;
  email: string;
  status: string;
  isActive: boolean;
}

export interface Gateway {
  id: number;
  name: string;
  gateway_name: string;
  isActive: boolean;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  merchantId?: number | null;
}
