import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantService } from "../services/merchantService";
import type { Merchant, MerchantRegistrationData } from "../../types/merchant";
import { merchantKeys } from "../queries/useMerchants";

export const useCreateMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Merchant>) => merchantService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: merchantKeys.stats() });
      toast.success("Merchant created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create merchant");
    },
  });
};

export const useUpdateMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Merchant> }) =>
      merchantService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: merchantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: merchantKeys.stats() });
      toast.success("Merchant updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update merchant");
    },
  });
};

export const useDeleteMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await merchantService.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: merchantKeys.stats() });
      queryClient.removeQueries({ queryKey: merchantKeys.detail(id) });
      toast.success("Merchant deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete merchant");
    },
  });
};

export const useApproveMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => merchantService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: merchantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: merchantKeys.stats() });
      toast.success("Merchant approved successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to approve merchant",
      );
    },
  });
};

export const useRejectMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => merchantService.reject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: merchantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: merchantKeys.stats() });
      toast.success("Merchant rejected");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject merchant");
    },
  });
};

export const useAssignUserToMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      userId,
    }: {
      merchantId: number;
      userId: number;
    }) => merchantService.assignUser(merchantId, userId),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: merchantKeys.detail(merchantId),
      });
      toast.success("User assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign user");
    },
  });
};

export const useRemoveUserFromMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      merchantId,
      userId,
    }: {
      merchantId: number;
      userId: number;
    }) => {
      await merchantService.removeUser(merchantId, userId);
      return { merchantId, userId };
    },
    onSuccess: ({ merchantId }) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: merchantKeys.detail(merchantId),
      });
      toast.success("User removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove user");
    },
  });
};

export const useUpdateMerchantPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      planType,
    }: {
      merchantId: number;
      planType: string;
    }) => merchantService.update(merchantId, { planType }),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: merchantKeys.detail(merchantId),
      });
      toast.success("Plan updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update plan");
    },
  });
};

export const useRegisterMerchant = () => {
  return useMutation({
    mutationFn: (data: MerchantRegistrationData) =>
      merchantService.register(data),
    onSuccess: () => {
      toast.success(
        "Registration submitted successfully! We will review your application.",
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    },
  });
};
