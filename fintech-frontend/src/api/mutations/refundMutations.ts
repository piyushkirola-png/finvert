import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRefund,
  updateRefundStatus,
  cancelRefund,
  exportRefunds,
} from "../services/refundService";
import type { CreateRefundPayload } from "../../types/refund";
import { toast } from "sonner";

export const useCreateRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRefundPayload) => createRefund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["refundStats"] });
      toast.success("Refund created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create refund");
    },
  });
};

export const useUpdateRefundStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateRefundStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["refundStats"] });
      toast.success(`Refund ${variables.status.toLowerCase()} successfully`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to update refund status",
      );
    },
  });
};

export const useCancelRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelRefund(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["refundStats"] });
      toast.success("Refund cancelled successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to cancel refund");
    },
  });
};

export const useExportRefunds = () => {
  return useMutation({
    mutationFn: (filters?: any) => exportRefunds(filters),
    onSuccess: () => {
      toast.success(
        "Export is being processed. You can download it from Transaction Reports.",
        { duration: 5000 },
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to export refunds");
    },
  });
};
