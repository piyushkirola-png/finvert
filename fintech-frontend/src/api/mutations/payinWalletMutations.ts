import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  refreshPayinWalletSummary,
  exportPayinWalletCSV,
} from "../services/payinWalletService";
import { PAYIN_WALLET_QUERY_KEYS } from "../queries/usePayinWallet";
import type { ExportPayinWalletFilters } from "../../types/payinWallet";

export const useRefreshPayinWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      userId,
    }: {
      merchantId?: number | null;
      userId?: number | null;
    }) => refreshPayinWalletSummary(merchantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PAYIN_WALLET_QUERY_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_WALLET_QUERY_KEYS.transactions(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_WALLET_QUERY_KEYS.stats(),
      });
      toast.success("Wallet summary refreshed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to refresh summary");
    },
  });
};

export const useExportPayinWallet = () => {
  return useMutation({
    mutationFn: (filters: ExportPayinWalletFilters) =>
      exportPayinWalletCSV(filters),
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
