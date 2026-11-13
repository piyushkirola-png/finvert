import { Trash2, CheckCircle2 } from "lucide-react";
import { MODAL_SHELL, MODAL_BODY, MODAL_FOOTER } from "../../lib/styles";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div
        className={`${MODAL_SHELL} max-w-sm`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_BODY}>
          <div className="text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${danger ? "bg-red-50" : "bg-green-50"}`}
            >
              {danger ? (
                <Trash2 className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
        </div>
        <div className={MODAL_FOOTER}>
          <button
            onClick={onCancel}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`h-9 px-4 rounded-md text-white text-sm font-medium transition disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
