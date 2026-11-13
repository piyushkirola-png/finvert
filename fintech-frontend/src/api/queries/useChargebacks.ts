import { useQuery } from "@tanstack/react-query";
import {
  getChargebacks,
  getChargebackStats,
  getMerchants,
  getGateways,
} from "../services/chargebackService";
import type {
  Chargeback,
  ChargebackApiFilters,
  ChargebackStats,
} from "../../types/chargeback";

export const useChargebacks = (filters?: ChargebackApiFilters) =>
  useQuery<{ data: Chargeback[]; total: number }>({
    queryKey: ["chargebacks", filters],
    queryFn: () => getChargebacks(filters),
  });

export const useChargebackStats = () =>
  useQuery<ChargebackStats>({
    queryKey: ["chargebackStats"],
    queryFn: getChargebackStats,
  });

export const useMerchantsForFilters = () =>
  useQuery<any[]>({
    queryKey: ["merchantsForFilters"],
    queryFn: getMerchants,
  });

export const useGatewaysForFilters = () =>
  useQuery<any[]>({
    queryKey: ["gatewaysForFilters"],
    queryFn: getGateways,
  });
