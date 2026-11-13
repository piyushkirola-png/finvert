import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantRoutingService } from "../services/merchantRoutingService";
import type { MerchantRoutingFormData } from "../../types/merchantRouting";
import { merchantRoutingKeys } from "../queries/useMerchantRouting";

export const useCreateMerchantRouting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MerchantRoutingFormData) =>
      merchantRoutingService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantRoutingKeys.lists() });
      toast.success("Routing configuration created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create routing configuration",
      );
    },
  });
};

export const useUpdateMerchantRouting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MerchantRoutingFormData }) =>
      merchantRoutingService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: merchantRoutingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: merchantRoutingKeys.detail(id),
      });
      toast.success("Routing configuration updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to update routing configuration",
      );
    },
  });
};

export const useDeleteMerchantRouting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await merchantRoutingService.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: merchantRoutingKeys.lists() });
      queryClient.removeQueries({ queryKey: merchantRoutingKeys.detail(id) });
      toast.success("Routing configuration deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete routing configuration",
      );
    },
  });
};
