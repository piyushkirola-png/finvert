import { useQuery } from "@tanstack/react-query";
import {
  getPayInRequests,
  getPayInRequestStats,
  getPayInRequestById,
  getFilterOptions,
} from "../services/payinRequestService";
import type {
  PayInRequestFilters,
  PayInRequestStats,
} from "../../types/payinRequest";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYIN_REQUEST_QUERY_KEYS = {
  all: ["payin-requests"] as const,
  lists: () => [...PAYIN_REQUEST_QUERY_KEYS.all, "list"] as const,
  list: (filters: PayInRequestFilters) =>
    [...PAYIN_REQUEST_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PAYIN_REQUEST_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PAYIN_REQUEST_QUERY_KEYS.details(), id] as const,
  stats: () => [...PAYIN_REQUEST_QUERY_KEYS.all, "stats"] as const,
  options: () => [...PAYIN_REQUEST_QUERY_KEYS.all, "options"] as const,
};

export const usePayInRequests = (filters: PayInRequestFilters) =>
  useQuery({
    queryKey: PAYIN_REQUEST_QUERY_KEYS.list(filters),
    queryFn: () => getPayInRequests(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayInRequestStats = () =>
  useQuery<PayInRequestStats>({
    queryKey: PAYIN_REQUEST_QUERY_KEYS.stats(),
    queryFn: getPayInRequestStats,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    enabled: hasToken(),
  });

export const usePayInRequestDetails = (id: number | null) =>
  useQuery({
    queryKey: PAYIN_REQUEST_QUERY_KEYS.detail(id || 0),
    queryFn: () => getPayInRequestById(id!),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const usePayInRequestFilterOptions = () =>
  useQuery({
    queryKey: PAYIN_REQUEST_QUERY_KEYS.options(),
    queryFn: getFilterOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });
