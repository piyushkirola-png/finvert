import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPayinWalletTransactions,
  getPayinWalletSummary,
  getPayinRequestStats,
  getPayinWalletTransactionById,
  getPayinWalletFilterOptions,
} from "../services/payinWalletService";
import type {
  PayinWalletFilters,
  PayinWalletSummary,
  PayinWalletStats,
} from "../../types/payinWallet";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYIN_WALLET_QUERY_KEYS = {
  all: ["payin-wallet"] as const,
  transactions: () => [...PAYIN_WALLET_QUERY_KEYS.all, "transactions"] as const,
  transactionList: (filters: PayinWalletFilters) =>
    [...PAYIN_WALLET_QUERY_KEYS.transactions(), filters] as const,
  summary: () => [...PAYIN_WALLET_QUERY_KEYS.all, "summary"] as const,
  stats: () => [...PAYIN_WALLET_QUERY_KEYS.all, "stats"] as const,
  detail: (id: number) =>
    [...PAYIN_WALLET_QUERY_KEYS.all, "detail", id] as const,
  options: () => [...PAYIN_WALLET_QUERY_KEYS.all, "options"] as const,
};

export const usePayinWalletTransactions = (filters: PayinWalletFilters) =>
  useQuery({
    queryKey: PAYIN_WALLET_QUERY_KEYS.transactionList(filters),
    queryFn: () => getPayinWalletTransactions(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
    placeholderData: keepPreviousData,
  });

export const usePayinWalletSummary = () =>
  useQuery<PayinWalletSummary>({
    queryKey: PAYIN_WALLET_QUERY_KEYS.summary(),
    queryFn: getPayinWalletSummary,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    enabled: hasToken(),
  });

export const usePayinRequestStats = () =>
  useQuery<PayinWalletStats>({
    queryKey: PAYIN_WALLET_QUERY_KEYS.stats(),
    queryFn: getPayinRequestStats,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayinWalletTransactionDetails = (id: number | null) =>
  useQuery({
    queryKey: PAYIN_WALLET_QUERY_KEYS.detail(id || 0),
    queryFn: () => getPayinWalletTransactionById(id!),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const usePayinWalletFilterOptions = () =>
  useQuery({
    queryKey: PAYIN_WALLET_QUERY_KEYS.options(),
    queryFn: getPayinWalletFilterOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });
