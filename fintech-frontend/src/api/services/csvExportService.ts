import api from "../../lib/api-client";
import type { ExportRecord } from "../../types/csvExport";

export const getExports = async (): Promise<ExportRecord[]> => {
  const { data } = await api.get("/csv/exports");
  return data.data ?? [];
};

export const downloadExport = async (id: number): Promise<Blob> => {
  const { data } = await api.get(`/csv/download/${id}`, {
    responseType: "blob",
  });
  return data;
};
