import { useQuery } from "@tanstack/react-query";
import {
  getRefunds,
  getRefundStats,
  getMerchantsForFilters,
  getPayInRequestById,
  getRefundsByPayInRequestId,
} from "../services/refundService";
import type { Refund, RefundApiFilters, RefundStats } from "../../types/refund";

export const useRefunds = (filters?: RefundApiFilters) =>
  useQuery<{ data: Refund[]; total: number }>({
    queryKey: ["refunds", filters],
    queryFn: () => getRefunds(filters),
  });

export const useRefundStats = () =>
  useQuery<RefundStats>({
    queryKey: ["refundStats"],
    queryFn: getRefundStats,
  });

export const useMerchantsForRefundFilters = () =>
  useQuery<any[]>({
    queryKey: ["merchantsForRefundFilters"],
    queryFn: getMerchantsForFilters,
  });

export const usePayInRequest = (id: number) =>
  useQuery<any>({
    queryKey: ["payInRequest", id],
    queryFn: () => getPayInRequestById(id),
    enabled: !!id,
  });

export const useRefundsByPayInRequest = (payInRequestId: number) =>
  useQuery<Refund[]>({
    queryKey: ["refundsByPayInRequest", payInRequestId],
    queryFn: () => getRefundsByPayInRequestId(payInRequestId),
    enabled: !!payInRequestId,
  });
