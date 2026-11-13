import { FileBarChart, Download } from "lucide-react";
import type { ExportRecord } from "../../types/csvExport";
import { EXPORT_TYPE_LABELS } from "../../types/csvExport";
import { TABLE_SHELL, TH, TD, TD_MONO } from "../../lib/styles";
import Pagination from "../../components/ui/Pagination";

type CSVExportTableProps = {
  filteredExports: ExportRecord[];
  loading: boolean;
  downloading: number | null;
  handleDownload: (id: number, exportType: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getFileSize: (bytes: number | null) => string;
  formatDate: (date: string | null) => string;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export default function CSVExportTable({
  filteredExports,
  loading,
  downloading,
  handleDownload,
  getStatusBadge,
  getFileSize,
  formatDate,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: CSVExportTableProps) {
  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredExports.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FileBarChart size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">
              No exports found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Export data from any module and it will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className={TH}>Type</th>
                <th className={TH}>Status</th>
                <th className={TH}>Size</th>
                <th className={TH}>Requested</th>
                <th className={TH}>Completed</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExports.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition border-t border-slate-100"
                >
                  <td className={TD}>
                    <span className="font-medium text-slate-900">
                      {EXPORT_TYPE_LABELS[item.exportType] || item.exportType}
                    </span>
                  </td>
                  <td className={TD}>{getStatusBadge(item.status)}</td>
                  <td className={TD_MONO}>{getFileSize(item.fileSize)}</td>
                  <td className={TD}>{formatDate(item.createdAt)}</td>
                  <td className={TD}>{formatDate(item.generatedAt)}</td>
                  <td className={TD}>
                    {item.status === "COMPLETED" ? (
                      <button
                        onClick={() => handleDownload(item.id, item.exportType)}
                        disabled={downloading === item.id}
                        className="p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600 disabled:opacity-50"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    ) : item.status === "FAILED" ? (
                      <span className="text-xs text-red-600">Failed</span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Processing...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
