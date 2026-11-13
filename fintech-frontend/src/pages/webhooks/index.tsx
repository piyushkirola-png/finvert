import { useState } from "react";
import InboundWebhooks from "./InboundWebhooks";
import OutboundWebhooks from "./OutboundWebhooks";

export default function Webhooks() {
  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab("inbound")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "inbound"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Inbound Webhooks
        </button>
        <button
          onClick={() => setTab("outbound")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "outbound"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Outbound Webhooks
        </button>
      </div>

      {tab === "inbound" ? <InboundWebhooks /> : <OutboundWebhooks />}
    </div>
  );
}
