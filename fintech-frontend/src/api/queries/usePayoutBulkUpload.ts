import { useQuery } from "@tanstack/react-query";
import {
  getPayoutBulkUploadHistory,
  getPayoutBulkUploadStats,
  getPayoutBulkUploadById,
} from "../services/payoutBulkUploadService";
import type {
  PayoutBulkUploadFilters,
  PayoutBulkUploadStats,
  PayoutBulkUploadRecord,
} from "../../types/payoutBulkUpload";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYOUT_BULK_UPLOAD_QUERY_KEYS = {
  all: ["payout-bulk-upload"] as const,
  history: () => [...PAYOUT_BULK_UPLOAD_QUERY_KEYS.all, "history"] as const,
  historyList: (filters: PayoutBulkUploadFilters, isAdmin: boolean) =>
    [...PAYOUT_BULK_UPLOAD_QUERY_KEYS.history(), filters, isAdmin] as const,
  stats: (statusFilter: string | undefined, isAdmin: boolean) =>
    [
      ...PAYOUT_BULK_UPLOAD_QUERY_KEYS.all,
      "stats",
      statusFilter,
      isAdmin,
    ] as const,
  detail: (id: number, isAdmin: boolean) =>
    [...PAYOUT_BULK_UPLOAD_QUERY_KEYS.all, "detail", id, isAdmin] as const,
};

export const usePayoutBulkUploadHistory = (
  filters: PayoutBulkUploadFilters,
  isAdmin: boolean,
) =>
  useQuery({
    queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.historyList(filters, isAdmin),
    queryFn: () => getPayoutBulkUploadHistory(filters, isAdmin),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayoutBulkUploadStats = (
  statusFilter?: string,
  isAdmin: boolean = true,
) =>
  useQuery<PayoutBulkUploadStats>({
    queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.stats(statusFilter, isAdmin),
    queryFn: () => getPayoutBulkUploadStats(statusFilter, isAdmin),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayoutBulkUploadDetails = (
  id: number | null,
  isAdmin: boolean = true,
) =>
  useQuery<PayoutBulkUploadRecord | null>({
    queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.detail(id || 0, isAdmin),
    queryFn: () => getPayoutBulkUploadById(id!, isAdmin),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
