import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantOnboardingService } from "../services/merchantOnboardingService";
import type {
  MerchantOnboardingData,
  MerchantRateFormData,
  MerchantDocumentUpload,
} from "../../types/merchantOnboarding";
import { onboardingKeys } from "../queries/useMerchantOnboarding";

export const useUpdateOnboardingMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<MerchantOnboardingData>;
    }) => merchantOnboardingService.updateMerchant(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.merchant(id) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update merchant");
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MerchantDocumentUpload) =>
      merchantOnboardingService.uploadDocument(data),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.documents(String(merchantId)),
      });
      toast.success("Document uploaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Upload failed");
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      docType,
      customName,
    }: {
      merchantId: string;
      docType: string;
      customName?: string;
    }) =>
      merchantOnboardingService.deleteDocument(merchantId, docType, customName),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.documents(merchantId),
      });
      toast.success("Document removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete document");
    },
  });
};

export const useVerifyDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      type,
      customName,
    }: {
      merchantId: string;
      type: string;
      customName?: string | null;
    }) =>
      merchantOnboardingService.verifyDocument(merchantId, type, customName),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.documents(merchantId),
      });
      toast.success("Document verified successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to verify document");
    },
  });
};

export const useRejectDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      type,
      customName,
    }: {
      merchantId: string;
      type: string;
      customName?: string | null;
    }) =>
      merchantOnboardingService.rejectDocument(merchantId, type, customName),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.documents(merchantId),
      });
      toast.success("Document rejected");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject document");
    },
  });
};

export const useAddMerchantRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MerchantRateFormData) =>
      merchantOnboardingService.addRate(data),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.rates(String(merchantId)),
      });
      toast.success("Rate added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add rate");
    },
  });
};

export const useUpdateMerchantRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MerchantRateFormData }) =>
      merchantOnboardingService.updateRate(id, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.rates(String(data.merchantId)),
      });
      toast.success("Rate updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update rate");
    },
  });
};

export const useDeleteMerchantRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      merchantId,
    }: {
      id: number;
      merchantId: string;
    }) => {
      await merchantOnboardingService.deleteRate(id);
      return { id, merchantId };
    },
    onSuccess: ({ merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.rates(merchantId),
      });
      toast.success("Rate deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete rate");
    },
  });
};

export const useAddIPToWhitelist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, ip }: { merchantId: string; ip: string }) =>
      merchantOnboardingService.addIP(merchantId, ip),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.ips(merchantId),
      });
      toast.success("IP added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add IP");
    },
  });
};

export const useUpdateIPInWhitelist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      merchantId,
      oldIp,
      newIp,
    }: {
      merchantId: string;
      oldIp: string;
      newIp: string;
    }) => merchantOnboardingService.updateIP(merchantId, oldIp, newIp),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.ips(merchantId),
      });
      toast.success("IP updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update IP");
    },
  });
};

export const useDeleteIPFromWhitelist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, ip }: { merchantId: string; ip: string }) =>
      merchantOnboardingService.deleteIP(merchantId, ip),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.ips(merchantId),
      });
      toast.success("IP deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete IP");
    },
  });
};
