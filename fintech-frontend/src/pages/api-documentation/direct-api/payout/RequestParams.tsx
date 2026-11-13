import { useState } from "react";
import { ArrowRight, Info, RefreshCw, Send } from "lucide-react";
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
  { key: "create", label: "Create Payout", icon: Send },
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
              <td className={TD_MONO}>{p.type}</td>
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
      description: "Unique payout reference (max 100 chars)",
    },
    {
      name: "amount",
      required: "Yes",
      type: "Decimal",
      description: "Payout amount (> 0.01, max 10,000,000)",
    },
    {
      name: "paymentMode",
      required: "Yes",
      type: "String",
      description: "BANK, UPI, RTGS, NEFT, IMPS",
    },
    {
      name: "beneficiary.name",
      required: "Yes",
      type: "String",
      description: "Beneficiary full name (max 100 chars)",
    },
    {
      name: "beneficiary.accountNumber",
      required: "Yes",
      type: "String",
      description: "Bank account number (9–18 digits)",
    },
    {
      name: "beneficiary.ifsc",
      required: "Yes",
      type: "String",
      description: "11-char IFSC code (e.g. HDFC0001234)",
    },
    {
      name: "beneficiary.bankName",
      required: "Yes",
      type: "String",
      description: "Beneficiary bank name",
    },
    {
      name: "beneficiary.email",
      required: "No",
      type: "String",
      description: "Beneficiary email (optional)",
    },
    {
      name: "beneficiary.mobile",
      required: "No",
      type: "String",
      description: "Beneficiary 10-digit mobile (optional)",
    },
  ];

  const statusParams: Param[] = [
    {
      name: "id",
      required: "Yes",
      type: "Integer",
      description: "Payout request ID (from create response)",
    },
  ];

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const apiUrl = `${apiBase}/payout-requests`;

  const createRequestExample = {
    amount: 100,
    merchantReference: "PAYOUT-001",
    paymentMode: "BANK",
    beneficiary: {
      name: "John Doe",
      accountNumber: "123456789",
      ifsc: "TEST123456",
      bankName: "Test Bank",
      email: "test@example.com",
      mobile: "9876543210",
    },
  };

  const successResponse = {
    success: true,
    data: {
      id: 101,
      merchantId: 1,
      userId: 2,
      amount: "100",
      status: "PENDING",
      merchantReference: "PAYOUT-001",
      paymentMode: "BANK",
      beneficiaryName: "John Doe",
      beneficiaryAccount: "123456789",
      beneficiaryBank: "Test Bank",
      beneficiaryIfsc: "TEST123456",
      merchantRate: "10",
      feeType: "FIXED",
      feeRate: "10",
      feeAmount: "10",
      taxRate: "10",
      taxAmount: "1",
      amountToDebit: "111",
      requestedAt: "2024-01-15T10:30:00Z",
      createdAt: "2024-01-15T10:30:00Z",
    },
  };

  const statusResponse = {
    success: true,
    data: {
      id: 101,
      status: "COMPLETED",
      merchantReference: "PAYOUT-001",
      amount: "101",
      completedAt: "2024-01-15T10:35:00Z",
      beneficiaryName: "John Doe",
      beneficiaryAccount: "123456789",
      beneficiaryBank: "Test Bank",
      beneficiaryIfsc: "TEST123456",
    },
  };

  const curlExample = `curl -X POST ${apiUrl} \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE" \\
  -d '{"amount":100,"merchantReference":"PAYOUT-001","paymentMode":"BANK","beneficiary":{"name":"John Doe","accountNumber":"123456789","ifsc":"TEST123456","bankName":"Test Bank","email":"test@example.com","mobile":"9876543210"}}'`;

  const statusCurlExample = `curl -X GET "${apiUrl}/197" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE"`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${CARD} p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">
                Create Payout
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
                {apiUrl}/:id
              </p>
            </div>
            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold flex-shrink-0">
              GET
            </span>
          </div>
        </div>
      </div>

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
              Create Payout Request
            </h4>
            <p className="text-sm text-slate-600">
              Send a POST request to create a payout. Funds are debited (amount
              + fee + GST) from your payout wallet.
            </p>
          </div>

          <Callout tone="warning">
            <strong>Note:</strong> Fee and GST are calculated automatically from
            your merchant rate. Total debit = amount + feeAmount + taxAmount.
          </Callout>

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
              Check Payout Status
            </h4>
            <p className="text-sm text-slate-600">
              Query a payout using its request ID.
            </p>
          </div>

          <div className={TABLE_SHELL}>
            <ParamsTable params={statusParams} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodeBlock label="GET Request" code={`${apiUrl}/197`} />
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
            Complete Payout Flow
          </h4>
          {[
            {
              step: 1,
              title: "Create Payout Request",
              desc: "Send a POST request with beneficiary details. Wallet funds are held immediately.",
            },
            {
              step: 2,
              title: "Gateway Processing",
              desc: "The payout is sent to the gateway. Status becomes PROCESSING then COMPLETED or FAILED.",
            },
            {
              step: 3,
              title: "Receive Webhook",
              desc: "You receive PAY_OUT_STATUS_UPDATE on every status change.",
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
            label="Create Payout"
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
