import api from "../../lib/api-client";
import type {
  Chargeback,
  ChargebackStats,
  ChargebackApiFilters,
} from "../../types/chargeback";

export const getChargebacks = async (
  filters?: ChargebackApiFilters,
): Promise<{ data: Chargeback[]; total: number }> => {
  const { data } = await api.get("/chargebacks", { params: filters });
  return {
    data: data.data ?? [],
    total: data.total ?? 0,
  };
};

export const getChargebackStats = async (): Promise<ChargebackStats> => {
  const { data } = await api.get("/chargebacks/stats");
  return {
    approved: data.approved ?? 0,
    rejected: data.rejected ?? 0,
    disputed: data.disputed ?? 0,
    reversed: data.reversed ?? 0,
    totalAmount: data.totalAmount ?? 0,
  };
};

export const updateChargebackStatus = async (
  id: number,
  status: string,
): Promise<void> => {
  await api.patch(`/chargebacks/${id}/status`, { status });
};

export const exportChargebacks = async (
  filters?: ChargebackApiFilters,
): Promise<void> => {
  await api.get("/chargebacks/export/csv", { params: filters });
};

export const getMerchants = async (): Promise<any[]> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (!isAdmin) return [];

    const { data } = await api.get("/merchants");
    const merchants = data.data ?? data;
    return Array.isArray(merchants) ? merchants : [];
  } catch {
    return [];
  }
};

export const getGateways = async (): Promise<any[]> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (!isAdmin) return [];

    const { data } = await api.get("/gateway");
    const gateways = data.data ?? data;
    return Array.isArray(gateways) ? gateways : [];
  } catch {
    return [];
  }
};
