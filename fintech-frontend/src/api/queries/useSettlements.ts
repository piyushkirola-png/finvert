import { useQuery } from "@tanstack/react-query";
import {
  getSettlements,
  getSettlementById,
} from "../services/settlementService";
import type { Settlement, SettlementFilters } from "../../types/settlement";

export const useSettlements = (filters?: SettlementFilters) =>
  useQuery<{ data: Settlement[]; pagination: any }>({
    queryKey: ["settlements", filters],
    queryFn: () => getSettlements(filters),
  });

export const useSettlement = (id: number) =>
  useQuery<Settlement>({
    queryKey: ["settlements", id],
    queryFn: () => getSettlementById(id),
    enabled: !!id,
  });
