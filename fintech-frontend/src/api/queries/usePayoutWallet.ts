import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPayoutWalletTransactions,
  getPayoutWalletSummary,
  getPayoutRequestStats,
  getPayoutWalletTransactionById,
  getPayoutWalletFilterOptions,
} from "../services/payoutWalletService";
import type {
  PayoutWalletFilters,
  PayoutWalletSummary,
  PayoutWalletStats,
} from "../../types/payoutWallet";

const hasToken = () =>
  !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("admin_accessToken") ||
    localStorage.getItem("user_accessToken")
  );

export const PAYOUT_WALLET_QUERY_KEYS = {
  all: ["payout-wallet"] as const,
  transactions: () =>
    [...PAYOUT_WALLET_QUERY_KEYS.all, "transactions"] as const,
  transactionList: (filters: PayoutWalletFilters) =>
    [...PAYOUT_WALLET_QUERY_KEYS.transactions(), filters] as const,
  summary: () => [...PAYOUT_WALLET_QUERY_KEYS.all, "summary"] as const,
  stats: () => [...PAYOUT_WALLET_QUERY_KEYS.all, "stats"] as const,
  detail: (id: number) =>
    [...PAYOUT_WALLET_QUERY_KEYS.all, "detail", id] as const,
  options: () => [...PAYOUT_WALLET_QUERY_KEYS.all, "options"] as const,
};

export const usePayoutWalletTransactions = (filters: PayoutWalletFilters) =>
  useQuery({
    queryKey: PAYOUT_WALLET_QUERY_KEYS.transactionList(filters),
    queryFn: () => getPayoutWalletTransactions(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
    placeholderData: keepPreviousData,
  });

export const usePayoutWalletSummary = () =>
  useQuery<PayoutWalletSummary>({
    queryKey: PAYOUT_WALLET_QUERY_KEYS.summary(),
    queryFn: getPayoutWalletSummary,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    enabled: hasToken(),
  });

export const usePayoutRequestStats = () =>
  useQuery<PayoutWalletStats>({
    queryKey: PAYOUT_WALLET_QUERY_KEYS.stats(),
    queryFn: getPayoutRequestStats,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });

export const usePayoutWalletTransactionDetails = (id: number | null) =>
  useQuery({
    queryKey: PAYOUT_WALLET_QUERY_KEYS.detail(id || 0),
    queryFn: () => getPayoutWalletTransactionById(id!),
    enabled: !!id && hasToken(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const usePayoutWalletFilterOptions = () =>
  useQuery({
    queryKey: PAYOUT_WALLET_QUERY_KEYS.options(),
    queryFn: getPayoutWalletFilterOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasToken(),
  });
