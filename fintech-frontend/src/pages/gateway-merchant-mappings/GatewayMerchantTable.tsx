import { Pencil, Trash2 } from "lucide-react";
import type { GatewayMapping } from "../../types/gatewayMerchantMapping";
import Pagination from "../../components/ui/Pagination";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  mappings: GatewayMapping[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onEdit: (mapping: GatewayMapping) => void;
  onDelete: (mapping: GatewayMapping) => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const ACTION_BTN =
  "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600";

export default function GatewayMerchantTable({
  mappings,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onEdit,
  onDelete,
}: Props) {
  const colCount = 5;

  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
        <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[800px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH}>Gateway</th>
              <th className={TH}>Merchant</th>
              <th className={TH}>Status</th>
              <th className={TH}>Assigned At</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : mappings.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  No gateway mappings found
                </td>
              </tr>
            ) : (
              mappings.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                >
                  <td className={`${TD} font-semibold text-slate-800`}>
                    {item.gatewayName || `Gateway #${item.gatewayId}`}
                  </td>
                  <td className={TD}>
                    {item.merchantName || `Merchant #${item.merchantId}`}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${BADGE_COLORS[item.status === "ACTIVE" ? "green" : "red"]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className={TD_MONO}>{formatDate(item.assignedAt)}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEdit(item)}
                        className={ACTION_BTN}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className={`${ACTION_BTN} hover:text-red-600`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
