import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPayoutBulkUpload,
  retryPayoutBulkUpload,
  downloadPayoutBulkUploadErrorReport,
  downloadPayoutBulkUploadTemplate,
} from "../services/payoutBulkUploadService";
import { PAYOUT_BULK_UPLOAD_QUERY_KEYS } from "../queries/usePayoutBulkUpload";
import type { CreatePayoutBulkUploadPayload } from "../../types/payoutBulkUpload";

export const useCreatePayoutBulkUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayoutBulkUploadPayload) =>
      createPayoutBulkUpload(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.all,
      });
      toast.success("Payout bulk upload submitted successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Upload failed. Please try again.",
      );
    },
  });
};

export const useRetryPayoutBulkUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => retryPayoutBulkUpload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.all,
      });
      toast.success("Retry initiated successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to retry failed rows.",
      );
    },
  });
};

export const useDownloadPayoutBulkUploadErrorReport = () => {
  return useMutation({
    mutationFn: (id: number) => downloadPayoutBulkUploadErrorReport(id),
    onSuccess: (data, id) => {
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payout-error-report-${id}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Error report downloaded successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to download error report.",
      );
    },
  });
};

export const useDownloadPayoutBulkUploadTemplate = () => {
  return useMutation({
    mutationFn: () => downloadPayoutBulkUploadTemplate(),
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "payout-bulk-upload-template.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded successfully.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to download template.",
      );
    },
  });
};
