import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPayinBulkUpload,
  downloadPayinBulkUploadTemplate,
  retryPayinBulkUpload,
  downloadPayinBulkUploadErrorReport,
  downloadPayinUpiIntents,
  type CreatePayinBulkUploadPayload,
} from "../services/payinBulkUploadService";
import { PAYIN_BULK_UPLOAD_QUERY_KEYS } from "../queries/usePayinBulkUpload";

export const useCreatePayinBulkUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayinBulkUploadPayload) =>
      createPayinBulkUpload(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.history(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.stats(),
      });
      toast.success("Payin bulk upload submitted successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Upload failed. Please try again.",
      );
    },
  });
};

export const useDownloadPayinBulkUploadTemplate = () =>
  useMutation({
    mutationFn: downloadPayinBulkUploadTemplate,
    onSuccess: () => toast.success("Template downloaded successfully"),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to download template",
      );
    },
  });

export const useRetryPayinBulkUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => retryPayinBulkUpload(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.history(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.stats(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.detail(id),
      });
      toast.success("Retry initiated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to retry failed rows",
      );
    },
  });
};

export const useDownloadPayinBulkUploadErrorReport = () =>
  useMutation({
    mutationFn: (id: number) => downloadPayinBulkUploadErrorReport(id),
    onSuccess: () => toast.success("Error report downloaded successfully"),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to download error report",
      );
    },
  });

  export const useDownloadPayinUpiIntents = () =>
  useMutation({
    mutationFn: (id: number) => downloadPayinUpiIntents(id),
    onSuccess: () => toast.success("UPI intents downloaded successfully"),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to download UPI intents",
      );
    },
  });