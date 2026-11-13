import { Eye, Pencil, Trash2 } from "lucide-react";
import type { MerchantRouting } from "../../types/merchantRouting";
import Pagination from "../../components/ui/Pagination";
import { TABLE_SHELL, TH, TD, BADGE, BADGE_COLORS } from "../../lib/styles";

interface Props {
  data: MerchantRouting[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onView: (row: MerchantRouting) => void;
  onEdit: (row: MerchantRouting) => void;
  onDelete: (row: MerchantRouting) => void;
}

const strategyColors: Record<string, keyof typeof BADGE_COLORS> = {
  PRIORITY: "blue",
  FAILOVER: "orange",
  LOAD_BALANCE: "green",
  HYBRID: "purple",
};

const ACTION_BTN =
  "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600";

export default function MerchantRoutingTable({
  data,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const colCount = 5;

  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
        <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH}>Merchant</th>
              <th className={TH}>Strategy</th>
              <th className={TH}>Gateways</th>
              <th className={TH}>Status</th>
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
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  No routing configurations found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                >
                  <td className={`${TD} font-semibold text-slate-800`}>
                    {item.merchantName || `Merchant #${item.merchantId}`}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[
                          strategyColors[item.routingStrategy] || "slate"
                        ]
                      }`}
                    >
                      {item.routingStrategy.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className={TD}>
                    {item.priorities?.length || 0} gateway(s)
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[item.isActive ? "green" : "red"]
                      }`}
                    >
                      {item.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onView(item)}
                        className={ACTION_BTN}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
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
