import api from "../../lib/api-client";
import type {
  RiskBlock,
  CreateRiskBlockPayload,
  UpdateRiskBlockPayload,
  RiskBlockFilters,
} from "../../types/risk";

export const getRiskBlocks = async (
  filters?: RiskBlockFilters,
): Promise<RiskBlock[]> => {
  const { data } = await api.get("/risk-blocks", { params: filters });
  return data.riskBlocks ?? [];
};

export const getRiskBlockById = async (id: number): Promise<RiskBlock> => {
  const { data } = await api.get(`/risk-blocks/${id}`);
  return data.riskBlock;
};

export const createRiskBlock = async (
  payload: CreateRiskBlockPayload,
): Promise<RiskBlock> => {
  const { data } = await api.post("/risk-blocks", payload);
  return data;
};

export const updateRiskBlock = async (
  id: number,
  payload: UpdateRiskBlockPayload,
): Promise<RiskBlock> => {
  const { data } = await api.put(`/risk-blocks/${id}`, payload);
  return data;
};

export const deleteRiskBlock = async (id: number): Promise<void> => {
  await api.delete(`/risk-blocks/${id}`);
};
