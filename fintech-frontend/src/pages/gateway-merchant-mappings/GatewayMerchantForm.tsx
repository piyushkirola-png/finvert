import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Gateway,
  Merchant,
  GatewayMapping,
} from "../../types/gatewayMerchantMapping";
import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  mode: "add" | "edit";
  gateways: Gateway[];
  merchants: Merchant[];
  mapping: GatewayMapping | null;
  submitting: boolean;
  onSubmit: (payload: {
    gatewayId?: string;
    merchantId?: string;
    status: string;
  }) => void;
  onCancel: () => void;
}

export default function GatewayMerchantForm({
  mode,
  gateways,
  merchants,
  mapping,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const isEdit = mode === "edit";

  const [formData, setFormData] = useState({
    gatewayId: "",
    merchantId: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (isEdit && mapping) {
      setFormData({
        gatewayId: String(mapping.gatewayId),
        merchantId: String(mapping.merchantId),
        status: mapping.status || "ACTIVE",
      });
    } else {
      setFormData({ gatewayId: "", merchantId: "", status: "ACTIVE" });
    }
  }, [isEdit, mapping]);

  const handleChange = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit) {
      onSubmit({ status: formData.status });
      return;
    }

    if (!formData.gatewayId || !formData.merchantId) {
      toast.error("Please select both gateway and merchant");
      return;
    }

    onSubmit({
      gatewayId: formData.gatewayId,
      merchantId: formData.merchantId,
      status: formData.status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEdit && mapping && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-sm">
          <div>
            <p className="text-xs text-slate-500">Gateway</p>
            <p className="font-semibold text-slate-900">
              {mapping.gatewayName || `Gateway #${mapping.gatewayId}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Merchant</p>
            <p className="font-semibold text-slate-900">
              {mapping.merchantName || `Merchant #${mapping.merchantId}`}
            </p>
          </div>
        </div>
      )}

      {/* Merchant / Gateway selects (add only) */}
      {!isEdit && (
        <>
          <div className="space-y-1">
            <label className={LABEL}>
              Merchant <span className="text-red-500">*</span>
            </label>
            <select
              className={INPUT}
              value={formData.merchantId}
              onChange={(e) => handleChange("merchantId", e.target.value)}
            >
              <option value="">Select Merchant...</option>
              {merchants
                .filter((m) => m.isActive !== false)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || `Merchant ${m.id}`}
                    {m.email ? ` (${m.email})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>
              Gateway <span className="text-red-500">*</span>
            </label>
            <select
              className={INPUT}
              value={formData.gatewayId}
              onChange={(e) => handleChange("gatewayId", e.target.value)}
            >
              <option value="">Select Gateway...</option>
              {gateways
                .filter((g) => g.isActive !== false)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.gateway_name || g.name || `Gateway ${g.id}`}
                  </option>
                ))}
            </select>
          </div>
        </>
      )}

      {/* Status */}
      <div className="space-y-1">
        <label className={LABEL}>
          Status <span className="text-red-500">*</span>
        </label>
        <select
          className={INPUT}
          value={formData.status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Preview (add only) */}
      {!isEdit && formData.gatewayId && formData.merchantId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
          <span className="font-semibold">Preview:</span>{" "}
          {gateways.find((g) => g.id === parseInt(formData.gatewayId))
            ?.gateway_name ||
            gateways.find((g) => g.id === parseInt(formData.gatewayId))?.name ||
            "Gateway"}{" "}
          →{" "}
          {merchants.find((m) => m.id === parseInt(formData.merchantId))
            ?.name || "Merchant"}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            submitting ||
            (!isEdit && (!formData.gatewayId || !formData.merchantId))
          }
          className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? "Updating..."
              : "Adding..."
            : isEdit
              ? "Update Status"
              : "Add Mapping"}
        </button>
      </div>
    </form>
  );
}
