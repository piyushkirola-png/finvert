import { useState } from "react";
import { ArrowRight, CreditCard, Info, RefreshCw } from "lucide-react";
import { CARD, TABLE_SHELL, TH, TD, TD_MONO } from "../../../../lib/styles";
import CodeBlock from "../../../../components/ui/CodeBlock";
import Callout from "../../../../components/ui/Callout";

interface Param {
  name: string;
  required: "Yes" | "No";
  type: string;
  description: string;
}

const TABS = [
  { key: "create", label: "Create PayIn", icon: CreditCard },
  { key: "status", label: "Check Status", icon: RefreshCw },
  { key: "flow", label: "Complete Flow", icon: ArrowRight },
] as const;

function RequiredBadge({ required }: { required: "Yes" | "No" }) {
  if (required === "Yes") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-md text-xs font-medium">
      Optional
    </span>
  );
}

function ParamsTable({ params }: { params: Param[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr>
            <th className={TH}>Parameter</th>
            <th className={TH}>Required</th>
            <th className={TH}>Data Type</th>
            <th className={TH}>Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {params.map((p, i) => (
            <tr key={i} className="hover:bg-slate-50 transition">
              <td className={`${TD_MONO} !text-slate-800`}>{p.name}</td>
              <td className={TD}>
                <RequiredBadge required={p.required} />
              </td>
              <td className={`${TD_MONO}`}>{p.type}</td>
              <td className={TD}>{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RequestParams() {
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("create");

  const createParams: Param[] = [
    {
      name: "merchantReference",
      required: "Yes",
      type: "String",
      description: "Unique order reference from merchant side (max 50 chars)",
    },
    {
      name: "amount",
      required: "Yes",
      type: "Decimal",
      description: "Amount to be paid (min 1.00)",
    },
    {
      name: "currency",
      required: "Yes",
      type: "String",
      description: "3 digit currency code, e.g. INR",
    },
    {
      name: "paymentMode",
      required: "Yes",
      type: "String",
      description: "UPI",
    },
    {
      name: "customer.name",
      required: "Yes",
      type: "String",
      description: "Customer's full name",
    },
    {
      name: "customer.email",
      required: "Yes",
      type: "String",
      description: "Customer's email address",
    },
    {
      name: "customer.phone",
      required: "Yes",
      type: "String",
      description: "Customer's phone number (10 digits)",
    },
  ];

  const statusParams: Param[] = [
    {
      name: "merchantReference",
      required: "Yes",
      type: "String",
      description: "Unique order reference from merchant side",
    },
  ];

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const apiUrl = `${apiBase}/payin-requests`;

  const createRequestExample = {
    amount: 1000,
    currency: "INR",
    merchantReference: "ORD-0324320098733",
    paymentMode: "CARD",
    customer: {
      name: "User Test",
      email: "user@example.com",
      phone: "9328832819",
    },
  };

  const successResponse = {
    utr: "",
    id: 810333,
    merchantId: 1,
    amount: "100",
    status: "PROCESSING",
    merchantReference: "ORD-103224323",
    userId: 2,
    requestedAt: "2026-10-22T11:16:40.129Z",
    completedAt: null,
    expiresAt: null,
    merchantRate: "6",
    payInWalletTransactionId: null,
    failureReason: null,
    failureCode: null,
    taxRate: "18",
    taxAmount: "1.08",
    feeType: "PERCENTAGE",
    feeRate: "6",
    feeAmount: "6",
    amountToCredit: "92.92",
    callbackNeeded: true,
    url: "data:text/html;charset=utf-8,...",
    createdAt: "2026-10-22T11:16:40.130Z",
    updatedAt: "2026-10-22T11:16:40.133Z",
    paymentMode: "UPI",
    customerName: "User Test",
    customerEmail: "user@example.com",
    customerPhone: "9328832819",
  };

  const statusResponse = {
    success: true,
    data: {
      id: 12345,
      merchantReference: "ORD-123456789",
      requestedAmount: 1500.0,
      amountToCredit: 1450.0,
      status: "COMPLETED",
      paymentMode: "UPI",
      requestedAt: "2024-01-15T10:30:00Z",
      completedAt: "2024-01-15T10:35:00Z",
      utr: "28223456789",
      bankReference: "BANK_REF_123456",
    },
  };

  const curlExample = `curl -X POST ${apiUrl} \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE" \\
  -d '{"amount":1000,"currency":"INR","merchantReference":"ORD-0324320098733","paymentMode":"CARD","customer":{"name":"User Test","email":"user@example.com","phone":"9328832819"}}'`;

  const statusCurlExample = `curl -X GET "${apiUrl}/reference/ORD-123456789" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE"`;

  return (
    <div className="space-y-6">
      {/* Endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${CARD} p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">
                Create PayIn
              </span>
              <p className="text-sm font-mono text-slate-800 mt-1 truncate">
                {apiUrl}
              </p>
            </div>
            <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-semibold flex-shrink-0">
              POST
            </span>
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">
                Check Status
              </span>
              <p className="text-sm font-mono text-slate-800 mt-1 truncate">
                {apiUrl}/reference/&lt;merchant-reference&gt;
              </p>
            </div>
            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold flex-shrink-0">
              GET
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-[#f5efe0]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === "create" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Create PayIn Request
            </h4>
            <p className="text-sm text-slate-600">
              Send a POST request to create a new PayIn request. The customer
              receives a payment link.
            </p>
          </div>

          <div className={TABLE_SHELL}>
            <ParamsTable params={createParams} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodeBlock
              label="Request Example"
              code={createRequestExample}
              maxHeight="max-h-[300px]"
            />
            <CodeBlock
              label="Success Response"
              code={successResponse}
              maxHeight="max-h-[300px]"
            />
          </div>
        </div>
      )}

      {activeTab === "status" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Check PayIn Status
            </h4>
            <p className="text-sm text-slate-600">
              Query the status of a PayIn using its merchant reference.
            </p>
          </div>

          <div className={TABLE_SHELL}>
            <ParamsTable params={statusParams} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodeBlock
              label="GET Request"
              code={`${apiUrl}/reference/ORD-123456789`}
            />
            <CodeBlock
              label="Status Response"
              code={statusResponse}
              maxHeight="max-h-[300px]"
            />
          </div>

          <Callout tone="info" title="Status Values" icon={Info}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>COMPLETED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>PENDING</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>FAILED</span>
              </div>
            </div>
          </Callout>
        </div>
      )}

      {activeTab === "flow" && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-800">
            Complete PayIn Flow
          </h4>
          {[
            {
              step: 1,
              title: "Create PayIn Request",
              desc: "Send a POST request with customer and payment details.",
            },
            {
              step: 2,
              title: "Customer Pays",
              desc: "Customer receives the payment link and completes the payment.",
            },
            {
              step: 3,
              title: "Receive Webhook",
              desc: "Get real-time notification about payment status.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {step}
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-slate-800">
                    {title}
                  </h5>
                  <p className="text-sm text-slate-600 mt-1">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          cURL Examples
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CodeBlock
            label="Create PayIn"
            code={curlExample}
            maxHeight="max-h-[300px]"
          />
          <CodeBlock
            label="Check Status"
            code={statusCurlExample}
            maxHeight="max-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}
