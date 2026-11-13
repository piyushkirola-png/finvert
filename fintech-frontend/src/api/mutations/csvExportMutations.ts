import { useMutation } from "@tanstack/react-query";
import { downloadExport } from "../services/csvExportService";
import { toast } from "sonner";
import { EXPORT_TYPE_LABELS } from "../../types/csvExport";

export const useDownloadExport = () => {
  return useMutation({
    mutationFn: ({ id, exportType }: { id: number; exportType: string }) =>
      downloadExport(id).then((blob) => ({ blob, exportType })),
    onSuccess: ({ blob, exportType }) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const typeLabel = EXPORT_TYPE_LABELS[exportType] || exportType;
      const fileName = `${typeLabel.toLowerCase().replace(/ /g, "_")}.csv`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`"${typeLabel}" downloaded successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to download file");
    },
  });
};
