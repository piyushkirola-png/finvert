export interface DashboardStats {
  currentBalance: number;
  chargebackAmount: number;
  refundAmount: number;
  transactions: number;
  successRate: number;

  todayPayIn: number;
  averagePayIn: number;
  successPayInCount: number;
  pendingPayInCount: number;
  failedPayInCount: number;
  payInSuccessRate: number;
  totalPayInTransactions: number;

  payoutWalletBalance: number;
  todayPayout: number;
  averagePayout: number;
  successPayoutCount: number;
  pendingPayoutCount: number;
  failedPayoutCount: number;
  payoutSuccessRate: number;
  totalPayoutTransactions: number;

  pendingSettlements: number;
}

export interface DashboardAlerts {
  failedCount: number;
  failedAmount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  alerts: DashboardAlerts;
}

export interface DashboardFilters {
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

export interface Transaction {
  id: string;
  transactionId?: string;
  type: "PAYIN" | "PAYOUT" | "REFUND" | "CHARGEBACK";
  merchantName: string;
  gatewayName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}
