import { useState } from "react";
import { Pencil, Trash2, Ban } from "lucide-react";
import Pagination from "../../components/ui/Pagination";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

interface Props {
  data: any[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onEdit: (row: any) => void;
  onDelete: (id: number) => void;
}

const formatType = (type: string) => {
  if (type === "CARD_BIN") return "Card BIN";
  if (type === "CARD_LAST4") return "Card Last 4";
  if (type === "VPA") return "VPA (UPI ID)";
  if (type === "IP_ADDRESS") return "IP Address";
  if (type === "DEVICE_ID") return "Device ID";
  return (
    type
      ?.split("_")
      ?.map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      ?.join(" ") || "-"
  );
};

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

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function RiskBlockTable({
  data,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onEdit,
  onDelete,
}: Props) {
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    id: number | null;
    value: string | null;
    isActive: boolean | null;
  }>({ open: false, id: null, value: null, isActive: null });

  const colCount = 7;

  const handleDeleteClick = (id: number, value: string, isActive: boolean) => {
    setDeleteState({ open: true, id, value, isActive });
  };

  const confirmDelete = () => {
    if (deleteState.id !== null) {
      onDelete(deleteState.id);
    }
    setDeleteState({ open: false, id: null, value: null, isActive: null });
  };

  const modalContent = deleteState.isActive
    ? {
        title: `Deactivate "${deleteState.value}"?`,
        description: `Are you sure you want to deactivate "${deleteState.value}"?`,
        action: "Deactivate",
        icon: <Ban className="w-6 h-6 text-yellow-600" />,
        wrap: "bg-yellow-50",
        buttonClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
      }
    : {
        title: `Delete "${deleteState.value}"?`,
        description: `Are you sure you want to delete "${deleteState.value}"?`,
        action: "Delete",
        icon: <Trash2 className="w-6 h-6 text-red-600" />,
        wrap: "bg-red-50",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
      };

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                <th className={TH}>Type</th>
                <th className={TH}>Value</th>
                <th className={TH}>Reason</th>
                <th className={TH}>Status</th>
                <th className={TH}>Created At</th>
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
                    No risk blocks found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                  >
                    <td className={TD_MONO}>{item.id}</td>
                    <td className={TD}>{formatType(item.type)}</td>
                    <td
                      className={`${TD_MONO} font-semibold text-slate-800 max-w-[220px] truncate`}
                    >
                      {item.value}
                    </td>
                    <td
                      className={`${TD} max-w-[220px] truncate`}
                      title={item.reason || "-"}
                    >
                      {item.reason || "-"}
                    </td>
                    <td className={TD}>
                      <span
                        className={`${BADGE} ${BADGE_COLORS[item.isActive ? "green" : "yellow"]}`}
                      >
                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className={TD}>{formatDate(item.createdAt)}</td>
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
                          onClick={() =>
                            handleDeleteClick(
                              item.id,
                              item.value,
                              item.isActive,
                            )
                          }
                          className={`${ACTION_BTN} ${
                            item.isActive
                              ? "hover:text-yellow-600"
                              : "hover:text-red-600"
                          }`}
                          title={item.isActive ? "Deactivate" : "Delete"}
                        >
                          {item.isActive ? (
                            <Ban size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
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

      {/* Delete/Deactivate confirmation modal */}
      {deleteState.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${modalContent.wrap}`}
                >
                  {modalContent.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {modalContent.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {modalContent.description}
                </p>
                <p className="text-xs text-red-500 font-medium mt-2">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() =>
                  setDeleteState({
                    open: false,
                    id: null,
                    value: null,
                    isActive: null,
                  })
                }
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className={`h-9 px-4 rounded-md text-sm font-medium transition ${modalContent.buttonClass}`}
              >
                Yes {modalContent.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
