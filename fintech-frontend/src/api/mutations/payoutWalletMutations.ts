import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  refreshPayoutWalletSummary,
  exportPayoutWalletCSV,
} from "../services/payoutWalletService";
import { PAYOUT_WALLET_QUERY_KEYS } from "../queries/usePayoutWallet";
import type { ExportPayoutWalletFilters } from "../../types/payoutWallet";

export const useRefreshPayoutWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId }: { merchantId?: number | null }) =>
      refreshPayoutWalletSummary(merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PAYOUT_WALLET_QUERY_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYOUT_WALLET_QUERY_KEYS.transactions(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYOUT_WALLET_QUERY_KEYS.stats(),
      });
      toast.success("Wallet summary refreshed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to refresh summary");
    },
  });
};

export const useExportPayoutWallet = () => {
  return useMutation({
    mutationFn: (filters: ExportPayoutWalletFilters) =>
      exportPayoutWalletCSV(filters),
    onSuccess: () => {
      toast.success(
        "Export is being processed. You can download it from Transaction Reports.",
        { duration: 5000 },
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start export. Please try again.");
    },
  });
};
