import api from "../../lib/api-client";
import type {
  Gateway,
  CreateGatewayPayload,
  UpdateGatewayPayload,
} from "../../types/gateway";

export const getGateways = async (): Promise<Gateway[]> => {
  const { data } = await api.get("/gateway");
  return data.data ?? [];
};

export const getGatewayById = async (id: number): Promise<Gateway> => {
  const { data } = await api.get(`/gateway/${id}`);
  return data.data;
};

export const createGateway = async (
  payload: CreateGatewayPayload,
): Promise<Gateway> => {
  const { data } = await api.post("/gateway", payload);
  return data.data;
};

export const updateGateway = async (
  id: number,
  payload: UpdateGatewayPayload,
): Promise<Gateway> => {
  const { data } = await api.put(`/gateway/${id}`, payload);
  return data.data;
};

export const deleteGateway = async (id: number): Promise<void> => {
  await api.delete(`/gateway/${id}`);
};
