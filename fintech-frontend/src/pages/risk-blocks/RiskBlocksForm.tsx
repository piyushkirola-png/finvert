import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  useCreateRiskBlock,
  useUpdateRiskBlock,
} from "../../api/mutations/riskMutations";
import type { RiskBlock } from "../../types/risk";
import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  riskBlock?: RiskBlock | null;
}

const RISK_BLOCK_TYPES = [
  { value: "USER_ID", label: "User ID" },
  { value: "MERCHANT_ID", label: "Merchant ID" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE_NUMBER", label: "Phone Number" },
  { value: "CARD_BIN", label: "Card BIN" },
  { value: "CARD_LAST4", label: "Card Last 4" },
  { value: "VPA", label: "VPA (UPI ID)" },
  { value: "IP_ADDRESS", label: "IP Address" },
  { value: "DEVICE_ID", label: "Device ID" },
];

export default function RiskBlocksForm({
  isOpen,
  onClose,
  onSubmit,
  riskBlock,
}: Props) {
  const [formData, setFormData] = useState({
    type: "USER_ID",
    value: "",
    reason: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createRiskBlock, isPending: isCreating } =
    useCreateRiskBlock();
  const { mutate: updateRiskBlock, isPending: isUpdating } =
    useUpdateRiskBlock();

  useEffect(() => {
    if (isOpen) {
      if (riskBlock) {
        setFormData({
          type: riskBlock.type || "USER_ID",
          value: riskBlock.value || "",
          reason: riskBlock.reason || "",
          isActive: riskBlock.isActive !== false,
        });
      } else {
        setFormData({
          type: "USER_ID",
          value: "",
          reason: "",
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, riskBlock]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const val = formData.value.trim();

    if (!formData.type) newErrors.type = "Type is required";

    if (!val) {
      newErrors.value = "Value is required";
    } else {
      if (formData.type === "EMAIL" && !val.includes("@")) {
        newErrors.value = "Email must contain '@'";
      } else if (formData.type === "PHONE_NUMBER") {
        const digits = val.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
          newErrors.value = `Phone number must be between 7 and 15 digits (currently ${digits.length} digits)`;
        }
      } else if (formData.type === "CARD_BIN") {
        const digits = val.replace(/\D/g, "");
        if (digits.length !== 6) {
          newErrors.value = `Card BIN must be exactly 6 digits (currently ${digits.length} digits)`;
        }
      } else if (formData.type === "CARD_LAST4") {
        const digits = val.replace(/\D/g, "");
        if (digits.length !== 4) {
          newErrors.value = `Card Last 4 must be exactly 4 digits (currently ${digits.length} digits)`;
        }
      } else if (formData.type === "VPA") {
        if (!val.includes("@")) {
          newErrors.value = "VPA must contain '@' (e.g., user@paytm)";
        }
      } else if (formData.type === "IP_ADDRESS") {
        const ipRegex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(val)) {
          newErrors.value = "Invalid IP address format (e.g., 192.168.1.100)";
        }
      } else if (formData.type === "DEVICE_ID") {
        if (val.length < 8) {
          newErrors.value = "Device ID must be at least 8 characters";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }
    setLoading(true);

    const payload = {
      type: formData.type,
      value: formData.value.trim(),
      reason: formData.reason.trim() || undefined,
      isActive: formData.isActive,
    };

    if (riskBlock?.id) {
      updateRiskBlock(
        { id: riskBlock.id, data: payload },
        {
          onSuccess: () => {
            setLoading(false);
            onSubmit();
            onClose();
          },
          onError: (error: any) => {
            setLoading(false);
            toast.error(
              error.response?.data?.message || "Failed to update risk block",
            );
          },
        },
      );
    } else {
      createRiskBlock(payload, {
        onSuccess: () => {
          setLoading(false);
          onSubmit();
          onClose();
        },
        onError: (error: any) => {
          setLoading(false);
          toast.error(
            error.response?.data?.message || "Failed to create risk block",
          );
        },
      });
    }
  };

  if (!isOpen) return null;

  const isLoading = loading || isCreating || isUpdating;

  const valuePlaceholder =
    formData.type === "EMAIL"
      ? "e.g., abcd@example.com"
      : formData.type === "PHONE_NUMBER"
        ? "e.g., 919876543210"
        : formData.type === "CARD_BIN"
          ? "e.g., 411111"
          : formData.type === "CARD_LAST4"
            ? "e.g., 4321"
            : formData.type === "VPA"
              ? "e.g., user@paytm"
              : formData.type === "IP_ADDRESS"
                ? "e.g., 192.168.1.100"
                : formData.type === "DEVICE_ID"
                  ? "e.g., device-fingerprint-123"
                  : "Enter block value";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div className="space-y-1">
          <label className={LABEL}>
            Block Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value, value: "" })
            }
            className={INPUT}
          >
            {RISK_BLOCK_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value */}
        <div className="space-y-1">
          <label className={LABEL}>
            Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder={valuePlaceholder}
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            className={`${INPUT} ${errors.value ? "border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {errors.value && (
            <p className="text-xs text-red-500 font-medium">{errors.value}</p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <label className={LABEL}>Reason (Optional)</label>
          <textarea
            placeholder="Specify the reason for blocking this entity..."
            value={formData.reason}
            onChange={(e) =>
              setFormData({ ...formData, reason: e.target.value })
            }
            rows={3}
            className={INPUT}
            style={{
              height: "auto",
              minHeight: "70px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          />
        </div>

        {/* Status Toggle */}
        <div className="space-y-1">
          <label className={LABEL}>Status</label>
          <label className="flex items-center gap-3 cursor-pointer mt-1 select-none">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            <span className="text-sm font-medium text-slate-700">
              {formData.isActive ? "Active (Rule Enforced)" : "Inactive"}
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isLoading
              ? "Saving..."
              : riskBlock
                ? "Save Changes"
                : "Create Block"}
          </button>
        </div>
      </form>
    </div>
  );
}
