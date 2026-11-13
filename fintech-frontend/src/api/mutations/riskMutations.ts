import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRiskBlock,
  updateRiskBlock,
  deleteRiskBlock,
} from "../services/riskService";
import type {
  CreateRiskBlockPayload,
  UpdateRiskBlockPayload,
} from "../../types/risk";
import { toast } from "sonner";

export const useCreateRiskBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRiskBlockPayload) => createRiskBlock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskBlocks"] });
      toast.success("Risk block created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create risk block",
      );
    },
  });
};

export const useUpdateRiskBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRiskBlockPayload }) =>
      updateRiskBlock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskBlocks"] });
      toast.success("Risk block updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update risk block",
      );
    },
  });
};

export const useDeleteRiskBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRiskBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskBlocks"] });
      toast.success("Risk block deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete risk block",
      );
    },
  });
};
