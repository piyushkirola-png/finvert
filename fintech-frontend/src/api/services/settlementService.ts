import api from "../../lib/api-client";
import type {
  Settlement,
  CreateSettlementPayload,
  SettlementFilters,
} from "../../types/settlement";

export const getSettlements = async (
  filters?: SettlementFilters,
): Promise<{ data: Settlement[]; pagination: any }> => {
  const { data } = await api.get("/settlements", { params: filters });
  return data;
};

export const getSettlementById = async (id: number): Promise<Settlement> => {
  const { data } = await api.get(`/settlements/${id}`);
  return data.data ?? data;
};

export const createSettlement = async (
  payload: CreateSettlementPayload,
): Promise<Settlement> => {
  let response;
  if (payload.type === "WALLET_SETTLEMENT") {
    response = await api.post("/settlements", payload);
  } else if (payload.type === "CREDIT_PAYOUT") {
    response = await api.post("/settlements/manual-settlement/credit", payload);
  } else if (payload.type === "DEBIT_PAYIN") {
    response = await api.post("/settlements/manual-settlement/debit", payload);
  } else {
    response = await api.post("/settlements", payload);
  }
  return response.data;
};

export const exportSettlements = async (): Promise<void> => {
  await api.get("/settlements/download");
};
