import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateChargebackStatus,
  exportChargebacks,
} from "../services/chargebackService";
import { toast } from "sonner";

export const useUpdateChargebackStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateChargebackStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chargebacks"] });
      queryClient.invalidateQueries({ queryKey: ["chargebackStats"] });
      toast.success(
        `Chargeback ${variables.status.toLowerCase()} successfully`,
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to update chargeback status",
      );
    },
  });
};

export const useExportChargebacks = () => {
  return useMutation({
    mutationFn: (filters?: any) => exportChargebacks(filters),
    onSuccess: () => {
      toast.success(
        "Export is being processed. You can download it from Transaction Reports.",
        { duration: 5000 },
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to export chargebacks",
      );
    },
  });
};
