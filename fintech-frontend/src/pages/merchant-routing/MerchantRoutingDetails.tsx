import type { MerchantRouting } from "../../types/merchantRouting";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  routing: MerchantRouting;
  gateways: { id: number; gateway_name: string }[];
  onClose: () => void;
}

const strategyColors: Record<string, keyof typeof BADGE_COLORS> = {
  PRIORITY: "blue",
  FAILOVER: "orange",
  LOAD_BALANCE: "green",
  HYBRID: "purple",
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span className="text-sm font-medium flex-1 text-slate-900">
      {value || "-"}
    </span>
  </div>
);

const SectionHeading = ({ title }: { title: string }) => (
  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
    {title}
  </p>
);

const formatDate = (d?: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function MerchantRoutingDetails({
  routing,
  gateways,
  onClose,
}: Props) {
  const getGatewayName = (id: number) =>
    gateways?.find((g) => g.id === id)?.gateway_name || `Gateway ${id}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${MODAL_SHELL} max-w-3xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h3 className="text-sm font-semibold text-slate-900">
            Routing Configuration Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {routing.merchantName || `Merchant #${routing.merchantId}`}
          </p>
        </div>

        <div className={MODAL_BODY}>
          <div className="grid grid-cols-2 gap-x-10">
            <div>
              <SectionHeading title="Configuration" />
              <Field
                label="Strategy"
                value={
                  <span
                    className={`${BADGE} ${
                      BADGE_COLORS[
                        strategyColors[routing.routingStrategy] || "slate"
                      ]
                    }`}
                  >
                    {routing.routingStrategy.replace(/_/g, " ")}
                  </span>
                }
              />
              <Field
                label="Status"
                value={
                  <span
                    className={`${BADGE} ${
                      BADGE_COLORS[routing.isActive ? "green" : "red"]
                    }`}
                  >
                    {routing.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                }
              />
            </div>
            <div>
              <SectionHeading title="Timestamps" />
              <Field label="Created At" value={formatDate(routing.createdAt)} />
              <Field label="Updated At" value={formatDate(routing.updatedAt)} />
            </div>
          </div>

          {routing.priorities && routing.priorities.length > 0 && (
            <>
              <SectionHeading title="Gateway Priority Order" />
              <div className="space-y-2">
                {routing.priorities
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200 text-sm flex-wrap"
                    >
                      <span className="font-bold text-slate-500 min-w-[20px]">
                        {p.priority}.
                      </span>
                      <span className="font-medium text-slate-900">
                        {getGatewayName(p.gatewayId)}
                      </span>
                      {p.paymentModes && p.paymentModes.length > 0 && (
                        <span className="text-xs text-slate-500">
                          Modes: {p.paymentModes.join(", ")}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Failover: {p.enableFailover ? "Yes" : "No"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Retries: {p.maxRetries}
                      </span>
                      <span
                        className={`${BADGE} ${
                          BADGE_COLORS[p.isActive ? "green" : "red"]
                        }`}
                      >
                        {p.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
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
