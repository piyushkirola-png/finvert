import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Gateway } from "../../types/gateway";
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
  gateways: Gateway[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onEdit: (id: number) => void;
  onDelete: (gateway: Gateway) => void;
  onView: (gateway: Gateway) => void;
}

const serviceTypeColors: Record<string, keyof typeof BADGE_COLORS> = {
  payin: "green",
  payout: "orange",
  both: "blue",
};

const ACTION_BTN =
  "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600";

export default function GatewayTable({
  gateways,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onEdit,
  onDelete,
  onView,
}: Props) {
  const colCount = 9;

  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
        <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1200px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH}>ID</th>
              <th className={TH}>Gateway Name</th>
              <th className={TH}>Service Type</th>
              <th className={TH}>Contact Name</th>
              <th className={TH}>Contact Number</th>
              <th className={TH}>Website URL</th>
              <th className={TH}>Status</th>
              <th className={TH}>Actions</th>
              <th className={TH}>Details</th>
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
            ) : gateways.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  No gateways found
                </td>
              </tr>
            ) : (
              gateways.map((gateway) => (
                <tr
                  key={gateway.id}
                  className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                >
                  <td className={TD_MONO}>{gateway.id}</td>
                  <td className={`${TD} font-semibold text-slate-800`}>
                    {gateway.gateway_name}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[
                          serviceTypeColors[gateway.service_type] || "slate"
                        ]
                      }`}
                    >
                      {gateway.service_type === "payin"
                        ? "PAYIN"
                        : gateway.service_type === "payout"
                          ? "PAYOUT"
                          : "BOTH"}
                    </span>
                  </td>
                  <td className={TD}>{gateway.contact_name || "-"}</td>
                  <td className={TD_MONO}>{gateway.contact_number || "-"}</td>
                  <td
                    className={`${TD} max-w-[200px] truncate`}
                    title={gateway.website_url || "-"}
                  >
                    {gateway.website_url ? (
                      <a
                        href={gateway.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {gateway.website_url}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[gateway.is_active ? "green" : "red"]
                      }`}
                    >
                      {gateway.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEdit(gateway.id)}
                        className={ACTION_BTN}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(gateway)}
                        className={`${ACTION_BTN} hover:text-red-600`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                  <td className={TD}>
                    <button
                      onClick={() => onView(gateway)}
                      className={ACTION_BTN}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
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
