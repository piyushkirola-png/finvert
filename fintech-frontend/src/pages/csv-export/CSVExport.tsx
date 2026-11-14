import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCSVExports } from "../../api/queries/useCSVExports";
import { useDownloadExport } from "../../api/mutations/csvExportMutations";
import type { ExportRecord } from "../../types/csvExport";
import CSVExportFilters from "./CSVExportFilters";
import CSVExportTable from "./CSVExportTable";
import {
  PAGE_HEADER,
  BTN_REFRESH,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

const STATUS_MAP: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  FAILED: "red",
  PROCESSING: "yellow",
};

export default function CSVExport() {
  const [filterType, setFilterType] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [downloading, setDownloading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: exports = [], refetch, isLoading: loading } = useCSVExports();
  const { mutate: downloadExport } = useDownloadExport();

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  const handleDownload = (exportId: number, exportType: string) => {
    setDownloading(exportId);
    downloadExport(
      { id: exportId, exportType },
      {
        onSettled: () => setDownloading(null),
        onError: () => setDownloading(null),
      },
    );
  };

  const getStatusBadge = (status: string) => (
    <span className={`${BADGE} ${BADGE_COLORS[STATUS_MAP[status] || "slate"]}`}>
      {status}
    </span>
  );

  const getFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredExports = exports.filter((e: ExportRecord) => {
    const matchType = filterType === "All" || e.exportType === filterType;
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    return matchType && matchStatus;
  });

  const total = filteredExports.length;
  const paginatedExports = filteredExports.slice(
    (page - 1) * limit,
    page * limit,
  );

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">CSV Export</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View and download all your exported CSV files
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CSVExportFilters
            filterType={filterType}
            setFilterType={(t) => {
              setFilterType(t);
              setPage(1);
            }}
            statusFilter={statusFilter}
            setStatusFilter={(s) => {
              setStatusFilter(s);
              setPage(1);
            }}
          />
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <CSVExportTable
        filteredExports={paginatedExports}
        loading={loading}
        downloading={downloading}
        handleDownload={handleDownload}
        getStatusBadge={getStatusBadge}
        getFileSize={getFileSize}
        formatDate={formatDate}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
