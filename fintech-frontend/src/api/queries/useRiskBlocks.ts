import { useQuery } from "@tanstack/react-query";
import { getRiskBlocks, getRiskBlockById } from "../services/riskService";
import type { RiskBlock, RiskBlockFilters } from "../../types/risk";

export const useRiskBlocks = (filters?: RiskBlockFilters) =>
  useQuery<RiskBlock[]>({
    queryKey: ["riskBlocks", filters],
    queryFn: () => getRiskBlocks(filters),
  });

export const useRiskBlock = (id: number) =>
  useQuery<RiskBlock>({
    queryKey: ["riskBlocks", id],
    queryFn: () => getRiskBlockById(id),
    enabled: !!id,
  });
