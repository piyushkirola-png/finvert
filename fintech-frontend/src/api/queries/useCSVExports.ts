import { useQuery } from "@tanstack/react-query";
import { getExports } from "../services/csvExportService";
import type { ExportRecord } from "../../types/csvExport";

export const useCSVExports = () =>
  useQuery<ExportRecord[]>({
    queryKey: ["csvExports"],
    queryFn: getExports,
  });
