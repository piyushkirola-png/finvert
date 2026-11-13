import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGateway } from "../../api/queries/useGateways";
import {
  useCreateGateway,
  useUpdateGateway,
} from "../../api/mutations/gatewayMutations";
import { INPUT, LABEL } from "../../lib/styles";

type ServiceType = "payin" | "payout" | "both";

interface Props {
  mode: "create" | "edit";
  gatewayId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function GatewayForm({
  mode,
  gatewayId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = mode === "edit";
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    gateway_name: "",
    service_type: "payin" as ServiceType,
    website_url: "",
    logo_url: "",
    contact_name: "",
    contact_number: "",
    email: "",
    is_active: true,
  });

  const { data: gatewayData } = useGateway(gatewayId || 0);
  const { mutate: createGateway } = useCreateGateway();
  const { mutate: updateGateway } = useUpdateGateway();

  useEffect(() => {
    if (isEdit && gatewayData) {
      setForm({
        gateway_name: gatewayData.gateway_name || "",
        service_type: gatewayData.service_type || "payin",
        website_url: gatewayData.website_url || "",
        logo_url: gatewayData.logo_url || "",
        contact_name: gatewayData.contact_name || "",
        contact_number: gatewayData.contact_number || "",
        email: gatewayData.email || "",
        is_active: gatewayData.is_active ?? true,
      });
    }
  }, [isEdit, gatewayData]);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.gateway_name.trim()) {
      toast.error("Gateway Name is required");
      return;
    }
    if (!form.contact_name.trim()) {
      toast.error("Contact Name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);

    if (isEdit && gatewayId) {
      updateGateway(
        {
          id: gatewayId,
          data: {
            gateway_name: form.gateway_name,
            service_type: form.service_type,
            website_url: form.website_url,
            logo_url: form.logo_url,
            contact_name: form.contact_name,
            contact_number: form.contact_number,
            email: form.email,
            is_active: form.is_active,
          },
        },
        {
          onSuccess: () => {
            setLoading(false);
            onSuccess?.();
          },
          onError: (error: any) => {
            setLoading(false);
            toast.error(error.response?.data?.message || "Server Error");
          },
        },
      );
    } else {
      createGateway(
        {
          name: form.gateway_name,
          serviceType: form.service_type,
          websiteUrl: form.website_url,
          logoUrl: form.logo_url,
          contactName: form.contact_name,
          contactPhone: form.contact_number,
          contactEmail: form.email,
          isActive: form.is_active,
        },
        {
          onSuccess: () => {
            setLoading(false);
            onSuccess?.();
          },
          onError: (error: any) => {
            setLoading(false);
            toast.error(error.response?.data?.message || "Server Error");
          },
        },
      );
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm animate-pulse">
          Please wait...
        </div>
      )}

      {/* Row 1: Gateway Name | Service Type (50:50) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={LABEL}>Gateway Name</label>
          <input
            placeholder="Enter gateway name"
            className={INPUT}
            value={form.gateway_name}
            onChange={(e) => handleChange("gateway_name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Service Type</label>
          <select
            className={INPUT}
            value={form.service_type}
            onChange={(e) =>
              handleChange("service_type", e.target.value as ServiceType)
            }
          >
            <option value="payin">PAYIN</option>
            <option value="payout">PAYOUT</option>
            <option value="both">BOTH</option>
          </select>
        </div>
      </div>

      {/* Row 2: Website URL | Logo URL (40:60) */}
      <div className="grid grid-cols-5 gap-3">
        <div className="space-y-1 col-span-2">
          <label className={LABEL}>Website URL</label>
          <input
            placeholder="https://example.com"
            className={INPUT}
            value={form.website_url}
            onChange={(e) => handleChange("website_url", e.target.value)}
          />
        </div>
        <div className="space-y-1 col-span-3">
          <label className={LABEL}>Logo URL</label>
          <input
            placeholder="Enter logo URL"
            className={INPUT}
            value={form.logo_url}
            onChange={(e) => handleChange("logo_url", e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Contact Name | Contact Number | Email Address */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className={LABEL}>Contact Name</label>
          <input
            placeholder="Enter contact name"
            className={INPUT}
            value={form.contact_name}
            onChange={(e) => handleChange("contact_name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Contact Number</label>
          <input
            placeholder="Enter contact number"
            className={INPUT}
            value={form.contact_number}
            onChange={(e) => handleChange("contact_number", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Email Address</label>
          <input
            placeholder="Enter email"
            className={INPUT}
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
      </div>

      {/* Active only in edit (original behaviour) */}
      {isEdit && (
        <div className="flex items-center gap-2 pt-1">
          <input
            id="gateway-active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => handleChange("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <label htmlFor="gateway-active" className="text-sm text-slate-700">
            Active Gateway
          </label>
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
          onClick={handleSubmit}
          disabled={loading}
          className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {loading
            ? "Please Wait..."
            : isEdit
              ? "Update Gateway"
              : "Create Gateway"}
        </button>
      </div>
    </div>
  );
}
