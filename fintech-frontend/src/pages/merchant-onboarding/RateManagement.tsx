import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  useAddMerchantRate,
  useUpdateMerchantRate,
  useDeleteMerchantRate,
} from "../../api/mutations/merchantOnboardingMutations";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_PRIMARY,
} from "../../lib/styles";

interface Props {
  rates: any[];
  setRates: React.Dispatch<React.SetStateAction<any[]>>;
  gateways: any[];
  merchantId?: string;
  merchant: any;
  currencySymbol: string;
  refetchRates: () => void;
}

const EMPTY_RATE = {
  gatewayId: "",
  direction: "PAYIN",
  minAmount: "",
  maxAmount: "",
  rateType: "FIXED",
  rateValue: "",
  taxRate: "",
  isActive: true,
};

const ICON_BTN = "p-1.5 rounded-md hover:bg-slate-100 transition";

export default function RateManagement({
  rates,
  setRates,
  gateways,
  merchantId,
  merchant,
  currencySymbol,
  refetchRates,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_RATE });

  const { mutate: addRate, isPending: isAdding } = useAddMerchantRate();
  const { mutate: updateRate, isPending: isUpdating } = useUpdateMerchantRate();
  const { mutate: deleteRate, isPending: isDeleting } = useDeleteMerchantRate();

  const set = (patch: Partial<typeof EMPTY_RATE>) =>
    setForm({ ...form, ...patch });
  const gatewayName = (g: any) => g.gatewayName || g.name || g.gateway_name;

  const payload = () => ({
    merchantId: Number(merchantId),
    gatewayId: Number(form.gatewayId),
    direction: form.direction as "PAYIN" | "PAYOUT",
    rateType: form.rateType as "FIXED" | "PERCENTAGE",
    rateValue: Number(form.rateValue),
    minAmount: form.minAmount || "0",
    maxAmount: form.maxAmount || "0",
    taxRate: Number(form.taxRate) || 0,
    isActive: form.isActive,
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_RATE });
  };

  const handleSave = () => {
    if (!form.gatewayId || !form.rateValue) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editingId) {
      updateRate(
        { id: editingId, data: payload() },
        {
          onSuccess: (data: any) => {
            setRates((prev) =>
              prev.map((r) => (r.id === editingId ? data : r)),
            );
            closeModal();
            refetchRates();
          },
        },
      );
    } else {
      addRate(payload(), {
        onSuccess: (data: any) => {
          setRates((prev) => [...prev, data]);
          closeModal();
          refetchRates();
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRate(
      { id: deleteId, merchantId: merchantId || "" },
      {
        onSuccess: () => {
          setRates((prev) => prev.filter((r) => r.id !== deleteId));
          setDeleteId(null);
          refetchRates();
        },
      },
    );
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      gatewayId: String(r.gatewayId),
      direction: r.direction,
      minAmount: String(r.minAmount ?? "0"),
      maxAmount: String(r.maxAmount ?? "0"),
      rateType: r.rateType,
      rateValue: String(r.rateValue),
      taxRate: String(r.taxRate ?? "0"),
      isActive: r.isActive,
    });
    setModalOpen(true);
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Rate Management
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure PAYIN / PAYOUT rates per gateway.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ ...EMPTY_RATE });
              setModalOpen(true);
            }}
            className={`${BTN_PRIMARY} h-10 px-4`}
          >
            <Plus size={16} /> Add Rate
          </button>
        </div>

        <div className={TABLE_SHELL + " !border-0 !rounded-none flex-1"}>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full whitespace-nowrap min-w-[950px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={TH}>Direction</th>
                  <th className={TH}>Gateway ID</th>
                  <th className={TH}>Gateway</th>
                  <th className={TH}>Min</th>
                  <th className={TH}>Max</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Tax</th>
                  <th className={TH}>Value</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-10 text-sm text-slate-500"
                    >
                      No rates configured
                    </td>
                  </tr>
                ) : (
                  rates.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                    >
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[r.direction === "PAYIN" ? "green" : "blue"]}`}
                        >
                          {r.direction}
                        </span>
                      </td>
                      <td className={TD_MONO}>{r.gatewayId}</td>
                      <td className={TD}>
                        {r.gateway?.gatewayName ||
                          r.gateway?.name ||
                          r.gateway?.gateway_name ||
                          "N/A"}
                      </td>
                      <td className={TD}>
                        {currencySymbol}
                        {r.minAmount}
                      </td>
                      <td className={TD}>
                        {currencySymbol}
                        {r.maxAmount}
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[r.rateType === "FIXED" ? "purple" : "blue"]}`}
                        >
                          {r.rateType}
                        </span>
                      </td>
                      <td className={TD}>{r.taxRate || 0}%</td>
                      <td className={`${TD} font-semibold`}>
                        {r.rateValue}
                        {r.rateType === "PERCENTAGE" ? "%" : ""}
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[r.isActive ? "green" : "red"]}`}
                        >
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className={`${ICON_BTN} text-slate-600`}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(r.id)}
                            className={`${ICON_BTN} text-red-600`}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-2xl max-h-[90vh]`}>
            <div className={MODAL_HEADER}>
              <h3 className="text-base font-semibold text-slate-900">
                {editingId ? "Edit Merchant Rate" : "Add Merchant Rate"}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {merchant?.merchantName}
                {merchant?.email ? ` • ${merchant.email}` : ""}
              </p>
            </div>

            <div className={`${MODAL_BODY} grid grid-cols-2 gap-4`}>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Gateway <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${INPUT} h-11`}
                  value={form.gatewayId}
                  onChange={(e) => set({ gatewayId: e.target.value })}
                >
                  <option value="">Select gateway</option>
                  {gateways.map((g) => (
                    <option key={g.id} value={g.id}>
                      {gatewayName(g)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Direction <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${INPUT} h-11`}
                  value={form.direction}
                  onChange={(e) => set({ direction: e.target.value })}
                >
                  <option value="PAYIN">PAYIN</option>
                  <option value="PAYOUT">PAYOUT</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Rate Type <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${INPUT} h-11`}
                  value={form.rateType}
                  onChange={(e) => set({ rateType: e.target.value })}
                >
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="FIXED">FIXED</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Rate Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className={`${INPUT} h-11`}
                  placeholder="Enter rate value"
                  value={form.rateValue}
                  onChange={(e) => set({ rateValue: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Min Amount</label>
                <input
                  type="number"
                  className={`${INPUT} h-11`}
                  placeholder="0"
                  value={form.minAmount}
                  onChange={(e) => set({ minAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Max Amount</label>
                <input
                  type="number"
                  className={`${INPUT} h-11`}
                  placeholder="0"
                  value={form.maxAmount}
                  onChange={(e) => set({ maxAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Tax Rate (%)</label>
                <input
                  type="number"
                  className={`${INPUT} h-11`}
                  placeholder="0"
                  value={form.taxRate}
                  onChange={(e) => set({ taxRate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Status</label>
                <select
                  className={`${INPUT} h-11`}
                  value={form.isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) =>
                    set({ isActive: e.target.value === "ACTIVE" })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className={MODAL_FOOTER}>
              <button
                onClick={closeModal}
                className="h-10 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isAdding || isUpdating}
                className={`${BTN_PRIMARY} h-10 px-5 disabled:opacity-50`}
              >
                {isAdding || isUpdating
                  ? "Saving..."
                  : editingId
                    ? "Update Rate"
                    : "Add Rate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        danger
        title="Delete Rate?"
        message="Are you sure you want to delete this rate configuration? This cannot be undone."
        confirmLabel="Yes, Delete"
        loading={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
