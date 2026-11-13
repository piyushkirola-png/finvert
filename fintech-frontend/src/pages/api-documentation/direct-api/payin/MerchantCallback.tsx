import { CheckCircle, XCircle } from "lucide-react";
import { TABLE_SHELL, TH, TD, TD_MONO } from "../../../../lib/styles";
import CodeBlock from "../../../../components/ui/CodeBlock";
import Callout from "../../../../components/ui/Callout";

export default function MerchantCallback() {
  const endpoint = "<YOUR_MERCHANT_WEBHOOK_URL>";

  const completedPayload = {
    event: "PAY_IN_STATUS_UPDATE",
    data: {
      id: 101,
      merchantReference: "ORD-103224323",
      status: "COMPLETED",
      amount: 100,
      amountToCredit: 92.92,
      completedAt: "2026-10-22T11:16:40.130Z",
      failureReason: null,
    },
    timestamp: "2026-10-22T11:16:40.200Z",
  };

  const failedPayload = {
    event: "PAY_IN_STATUS_UPDATE",
    data: {
      id: 101,
      merchantReference: "ORD-103224324",
      status: "FAILED",
      amount: 100,
      amountToCredit: 0,
      completedAt: null,
      failureReason: "Customer declined the transaction",
    },
    timestamp: "2026-10-22T11:18:12.501Z",
  };

  const bodyFields = [
    {
      field: "event",
      type: "String",
      desc: (
        <>
          Always{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-blue-700">
            PAY_IN_STATUS_UPDATE
          </code>
        </>
      ),
    },
    { field: "data.id", type: "Integer", desc: "Internal PayIn request ID" },
    {
      field: "data.merchantReference",
      type: "String",
      desc: "Your original order reference",
    },
    {
      field: "data.status",
      type: "String",
      desc: <>COMPLETED | PENDING | FAILED</>,
    },
    { field: "data.amount", type: "Number", desc: "Original requested amount" },
    {
      field: "data.amountToCredit",
      type: "Number",
      desc: "Amount credited to your wallet (after fee + tax). 0 on FAILED.",
    },
    {
      field: "data.completedAt",
      type: "ISO String | null",
      desc: "Set only when the request reaches a terminal state",
    },
    {
      field: "data.failureReason",
      type: "String | null",
      desc: "Reason for failure. Null on COMPLETED.",
    },
    {
      field: "timestamp",
      type: "ISO String",
      desc: "Time this callback was generated",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        When a PayIn request reaches a terminal state, we send a{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
          POST
        </code>{" "}
        request with a JSON body to the <strong>Webhook URL</strong> configured
        on your merchant account. This page documents that outbound request
        body.
      </p>

      <div className="bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs font-mono text-slate-400">
            Merchant Webhook Endpoint
          </span>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 rounded-md text-xs font-semibold">
              POST
            </span>
            <span className="text-sm font-mono text-blue-400 break-all">
              {endpoint}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800 mt-2">
            <div>
              <span className="text-xs text-slate-500">Content-Type</span>
              <p className="text-xs font-mono text-slate-300">
                application/json
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Timeout</span>
              <p className="text-xs font-mono text-slate-300">10 seconds</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Event</span>
              <p className="text-xs font-mono text-purple-400">
                PAY_IN_STATUS_UPDATE
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Request Body Parameters
        </h4>
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className={TH}>Field</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyFields.map((f) => (
                  <tr key={f.field} className="hover:bg-slate-50 transition">
                    <td className={`${TD_MONO} !text-slate-800`}>{f.field}</td>
                    <td className={TD_MONO}>{f.type}</td>
                    <td className={TD}>{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Example Payloads
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CodeBlock
            label="COMPLETED"
            code={completedPayload}
            maxHeight="max-h-[320px]"
            tone="green"
            headerIcon={<CheckCircle size={14} className="text-green-400" />}
          />
          <CodeBlock
            label="FAILED"
            code={failedPayload}
            maxHeight="max-h-[320px]"
            tone="red"
            headerIcon={<XCircle size={14} className="text-red-400" />}
          />
        </div>
      </div>

      <Callout tone="info" title="Delivery & Retry">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            We retry up to <strong>3 times</strong> with exponential backoff (
            <strong>4s → 8s</strong>), each attempt with a 10s timeout.
          </li>
          <li>
            If all 3 attempts fail, the callback is{" "}
            <strong>queued and retried automatically</strong> about{" "}
            <strong>5 minutes</strong> later (up to 3 more attempts).
          </li>
          <li>
            After that, retries must be triggered manually from{" "}
            <strong>Admin → Webhooks → Outbound</strong>.
          </li>
          <li>
            Your endpoint must respond with any <strong>2xx</strong> status to
            acknowledge. Anything else is treated as a failure and retried.
          </li>
        </ul>
      </Callout>

      <Callout tone="neutral" title="Verifying a Callback">
        <p>
          Outbound callbacks are <strong>not signed</strong> today. To confirm a
          callback, query the status endpoint using the{" "}
          <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
            merchantReference
          </code>
          :
        </p>
        <pre className="mt-2 text-xs font-mono text-blue-700 bg-white p-2 rounded border border-slate-200 break-all whitespace-pre-wrap">
          GET /api/payin-requests/reference/ORD-123456789
        </pre>
      </Callout>

      <Callout tone="neutral" title="Important">
        If no Webhook URL is configured on your merchant account, we will{" "}
        <strong>not</strong> send any callback. Configure one from{" "}
        <strong>Settings → Webhooks</strong>.
      </Callout>
    </div>
  );
}
