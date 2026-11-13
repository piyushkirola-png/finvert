import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useBulkUploadHistory } from "../../api/queries/usePayinBulkUpload";
import Pagination from "../../components/ui/Pagination";
import BulkUploadSummary from "./BulkUploadSummary";
import type { BulkUploadFiltersState } from "./BulkUploadFilters";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface UploadRecord {
  id: number;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  mode?: string;
  createdAt: string;
  processedAt: string | null;
  merchantId?: number;
  merchant?: { id: number; name: string; email: string };
  userId?: number;
  user?: { id: number; fullName: string; email: string };
  scheduledTask?: { id: number; scheduledTime: string; status: string } | null;
}

interface Props {
  filters: BulkUploadFiltersState;
  isAdmin?: boolean;
}

const statusTone: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PROCESSING: "orange",
  FAILED: "red",
};

export default function BulkUploadTable({ filters, isAdmin = false }: Props) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<UploadRecord | null>(null);

  const offset = (page - 1) * limit;

  const { data, isLoading } = useBulkUploadHistory({
    offset,
    limit,
    status: filters.status,
  });

  const allRecords = (data?.data || []) as UploadRecord[];

  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (filters.mode !== "ALL") {
        const mode = r.scheduledTask ? "scheduled" : r.mode || "instant";
        if (mode.toLowerCase() !== filters.mode.toLowerCase()) return false;
      }
      if (isAdmin && filters.merchantId !== "ALL") {
        const mid = String(r.merchantId ?? r.merchant?.id ?? "");
        if (mid !== filters.merchantId) return false;
      }
      if (isAdmin && filters.userId !== "ALL") {
        const uid = String(r.userId ?? r.user?.id ?? "");
        if (uid !== filters.userId) return false;
      }
      return true;
    });
  }, [allRecords, filters, isAdmin]);

  const total = records.length;
  const paged = useMemo(
    () => records.slice(offset, offset + limit),
    [records, offset, limit],
  );

  const getMode = (r: UploadRecord) => {
    if (r.scheduledTask) return "Scheduled";
    if (r.mode) return r.mode.charAt(0).toUpperCase() + r.mode.slice(1);
    return "Instant";
  };

  const colCount = isAdmin ? 11 : 9;

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table
            className={`w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap ${isAdmin ? "min-w-[1400px]" : "min-w-[1000px]"
              }`}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                {isAdmin && <th className={TH}>Merchant</th>}
                {isAdmin && <th className={TH}>User</th>}
                <th className={TH}>File Name</th>
                <th className={TH}>Total Rows</th>
                <th className={TH}>Success</th>
                <th className={TH}>Failed</th>
                <th className={TH}>Mode</th>
                <th className={TH}>Status</th>
                <th className={TH}>Uploaded</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    Loading payin uploads...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    No payin uploads found.
                  </td>
                </tr>
              ) : (
                paged.map((record, i) => {
                  const serial = total - offset - i;
                  const mode = getMode(record);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50 border-t border-slate-100 transition-colors"
                    >
                      <td className={TD_MONO}>{serial}</td>
                      {isAdmin && (
                        <td className={`${TD} font-medium`}>
                          {record.merchant?.name || "N/A"}
                        </td>
                      )}
                      {isAdmin && (
                        <td className={TD}>{record.user?.fullName || "N/A"}</td>
                      )}
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet
                            size={14}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <span className="font-medium truncate max-w-[180px]">
                            {record.fileName}
                          </span>
                        </div>
                      </td>
                      <td className={`${TD} font-medium`}>
                        {record.totalRows}
                      </td>
                      <td className={`${TD} font-medium text-green-600`}>
                        {record.successRows}
                      </td>
                      <td className={`${TD} font-medium text-red-600`}>
                        {record.failedRows}
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${mode === "Scheduled"
                              ? BADGE_COLORS.green
                              : BADGE_COLORS.yellow
                            }`}
                        >
                          {mode}
                        </span>
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[statusTone[record.status] || "slate"]
                            }`}
                        >
                          {record.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className={`${TD} text-xs !text-slate-500`}>
                        {new Date(record.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => setSelected(record)}
                          className="h-7 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-[#f5efe0] transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </div>

      {selected && (
        <BulkUploadSummary
          uploadId={selected.id}
          onClose={() => setSelected(null)}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
