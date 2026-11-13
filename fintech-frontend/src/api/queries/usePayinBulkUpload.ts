import { useQuery } from "@tanstack/react-query";
import {
  getBulkUploadHistory,
  getBulkUploadStats,
  getBulkUploadById,
} from "../services/payinBulkUploadService";
import type {
  BulkUploadFilters,
  BulkUploadStats,
  BulkUploadRecord,
} from "../../types/payinBulkUpload";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYIN_BULK_UPLOAD_QUERY_KEYS = {
  all: ["payin-bulk-upload"] as const,
  history: () => [...PAYIN_BULK_UPLOAD_QUERY_KEYS.all, "history"] as const,
  historyList: (filters: BulkUploadFilters) =>
    [...PAYIN_BULK_UPLOAD_QUERY_KEYS.history(), filters] as const,
  stats: (statusFilter?: string) =>
    [...PAYIN_BULK_UPLOAD_QUERY_KEYS.all, "stats", statusFilter] as const,
  detail: (id: number) =>
    [...PAYIN_BULK_UPLOAD_QUERY_KEYS.all, "detail", id] as const,
};

export const useBulkUploadHistory = (filters: BulkUploadFilters) =>
  useQuery({
    queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.historyList(filters),
    queryFn: () => getBulkUploadHistory(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const useBulkUploadStats = (
  statusFilter?: string,
  isAdmin: boolean = true,
) =>
  useQuery<BulkUploadStats>({
    queryKey: [...PAYIN_BULK_UPLOAD_QUERY_KEYS.stats(statusFilter), isAdmin],
    queryFn: () => getBulkUploadStats(statusFilter),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const useBulkUploadDetails = (id: number | null) =>
  useQuery<BulkUploadRecord | null>({
    queryKey: PAYIN_BULK_UPLOAD_QUERY_KEYS.detail(id || 0),
    queryFn: () => getBulkUploadById(id!),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
