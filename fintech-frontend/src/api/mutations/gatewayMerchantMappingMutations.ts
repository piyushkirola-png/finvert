import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gatewayMerchantMappingService } from "../services/gatewayMerchantMappingService";
import { gatewayMappingKeys } from "../queries/useGatewayMerchantMapping";
import type { GatewayMappingFormData } from "../../types/gatewayMerchantMapping";

export const useCreateGatewayMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GatewayMappingFormData) =>
      gatewayMerchantMappingService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayMappingKeys.lists() });
      toast.success("Mapping added successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add mapping");
    },
  });
};

export const useUpdateGatewayMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) =>
      gatewayMerchantMappingService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: gatewayMappingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: gatewayMappingKeys.detail(id),
      });
      toast.success("Mapping updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update mapping");
    },
  });
};

export const useDeleteGatewayMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gatewayMerchantMappingService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayMappingKeys.lists() });
      toast.success("Mapping deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete mapping");
    },
  });
};
