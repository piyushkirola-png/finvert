import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSettlement,
  exportSettlements,
} from "../services/settlementService";
import type { CreateSettlementPayload } from "../../types/settlement";
import { toast } from "sonner";

export const useCreateSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSettlementPayload) => createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast.success("Settlement completed successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to process settlement",
      );
    },
  });
};

export const useExportSettlements = () => {
  return useMutation({
    mutationFn: () => exportSettlements(),
    onSuccess: () => {
      toast.success(
        "Export is being processed. You can download it from Transaction Reports.",
        { duration: 5000 },
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to export settlements",
      );
    },
  });
};
