export interface ExportRecord {
  id: number;
  exportType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  filters: any;
  startDate: string | null;
  endDate: string | null;
  fileSize: number | null;
  createdAt: string;
  generatedAt: string | null;
}

export const EXPORT_TYPE_LABELS: Record<string, string> = {
  PAYIN_REQUESTS: "PAYIN REQUESTS",
  PAYOUT_REQUESTS: "PAYOUT REQUESTS",
  PAYIN_WALLETS: "PAYIN WALLET",
  PAYOUT_WALLETS: "PAYOUT WALLET",
  SETTLEMENTS: "SETTLEMENTS",
  CHARGEBACKS: "CHARGEBACKS",
  REFUNDS: "REFUNDS",
};
