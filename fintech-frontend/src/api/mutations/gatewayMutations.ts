import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createGateway,
  updateGateway,
  deleteGateway,
} from "../services/gatewayService";
import type {
  CreateGatewayPayload,
  UpdateGatewayPayload,
} from "../../types/gateway";
import { toast } from "sonner";

export const useCreateGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGatewayPayload) => createGateway(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create gateway");
    },
  });
};

export const useUpdateGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGatewayPayload }) =>
      updateGateway(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update gateway");
    },
  });
};

export const useDeleteGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGateway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete gateway");
    },
  });
};
