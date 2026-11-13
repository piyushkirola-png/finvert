import { ExternalLink } from "lucide-react";
import type { Gateway } from "../../types/gateway";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  gateway: Gateway;
  onClose: () => void;
}

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-sm font-medium flex-1 text-slate-900 ${mono ? "font-mono" : ""}`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function GatewaySummary({ gateway, onClose }: Props) {
  const serviceType = gateway.service_type;
  const serviceColor =
    serviceType === "payin"
      ? "green"
      : serviceType === "payout"
        ? "orange"
        : "blue";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${MODAL_SHELL} max-w-2xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Gateway Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                ID: {gateway.id}
              </p>
            </div>
            <span
              className={`${BADGE} ${BADGE_COLORS[gateway.is_active ? "green" : "red"]}`}
            >
              {gateway.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        <div className={MODAL_BODY}>
          <div className="grid grid-cols-1">
            <Field label="Gateway Name" value={gateway.gateway_name} />
            <Field
              label="Service Type"
              value={
                <span
                  className={`${BADGE} ${BADGE_COLORS[serviceColor as keyof typeof BADGE_COLORS]}`}
                >
                  {serviceType === "payin"
                    ? "PAYIN"
                    : serviceType === "payout"
                      ? "PAYOUT"
                      : "BOTH"}
                </span>
              }
            />
            <Field label="Contact Person" value={gateway.contact_name} />
            <Field label="Contact Number" value={gateway.contact_number} />
            <Field label="Email Address" value={gateway.email} />
            <Field
              label="Website URL"
              value={
                gateway.website_url ? (
                  <a
                    href={gateway.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {gateway.website_url}
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <Field
              label="Logo"
              value={
                gateway.logo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <img
                        src={gateway.logo_url}
                        alt={gateway.gateway_name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <a
                      href={gateway.logo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      View Logo
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  "-"
                )
              }
            />
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
