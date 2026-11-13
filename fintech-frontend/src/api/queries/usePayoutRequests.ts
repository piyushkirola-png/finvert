import { useQuery } from "@tanstack/react-query";
import {
  getPayoutRequests,
  getPayoutRequestStats,
  getPayoutRequestById,
  getFilterOptions,
} from "../services/payoutRequestService";
import type {
  PayoutRequestFilters,
  PayoutRequestStats,
} from "../../types/payoutRequest";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYOUT_REQUEST_QUERY_KEYS = {
  all: ["payout-requests"] as const,
  lists: () => [...PAYOUT_REQUEST_QUERY_KEYS.all, "list"] as const,
  list: (filters: PayoutRequestFilters) =>
    [...PAYOUT_REQUEST_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PAYOUT_REQUEST_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PAYOUT_REQUEST_QUERY_KEYS.details(), id] as const,
  stats: () => [...PAYOUT_REQUEST_QUERY_KEYS.all, "stats"] as const,
  options: () => [...PAYOUT_REQUEST_QUERY_KEYS.all, "options"] as const,
};

export const usePayoutRequests = (filters: PayoutRequestFilters) =>
  useQuery({
    queryKey: PAYOUT_REQUEST_QUERY_KEYS.list(filters),
    queryFn: () => getPayoutRequests(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayoutRequestStats = () =>
  useQuery<PayoutRequestStats>({
    queryKey: PAYOUT_REQUEST_QUERY_KEYS.stats(),
    queryFn: getPayoutRequestStats,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    enabled: hasToken(),
  });

export const usePayoutRequestDetails = (id: number | null) =>
  useQuery({
    queryKey: PAYOUT_REQUEST_QUERY_KEYS.detail(id || 0),
    queryFn: () => getPayoutRequestById(id!),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const usePayoutRequestFilterOptions = () =>
  useQuery({
    queryKey: PAYOUT_REQUEST_QUERY_KEYS.options(),
    queryFn: getFilterOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });
