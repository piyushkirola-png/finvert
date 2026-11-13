import { ExternalLink, Globe, Shield, Code } from "lucide-react";
import { PAGE_HEADER } from "../../../../lib/styles";
import CodeBlock from "../../../../components/ui/CodeBlock";
import Callout from "../../../../components/ui/Callout";

export default function HostedCheckout() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const createSessionExample = {
    amount: 1000,
    currency: "INR",
    merchantReference: "ORD-0324320098733",
    customer: {
      name: "User Test",
      email: "user@example.com",
      phone: "9328832819",
    },
    redirectUrl: "https://your-site.com/payment/callback",
  };

  const sessionResponse = {
    success: true,
    data: {
      id: 810333,
      merchantReference: "ORD-0324320098733",
      checkoutUrl: "https://checkout.example.com/pay/abc123xyz",
      expiresAt: "2026-10-22T11:31:40.129Z",
    },
  };

  const curlExample = `curl -X POST ${apiBase}/payout-requests \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE" \\
  -d '{"amount":1000,"currency":"INR","merchantReference":"ORD-0324320098733","customer":{"name":"User Test","email":"user@example.com","phone":"9328832819"},"redirectUrl":"https://your-site.com/payment/callback"}'`;

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Hosted Checkout
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Redirect customers to a secure, PCI-compliant payment page. No card
            data touches your servers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium">
          v1.0.0
        </div>
      </div>

      <Callout tone="info" title="What is Hosted Checkout?" icon={Globe}>
        Hosted Checkout lets you accept payments by redirecting the customer to
        a page we host. You create a payment request, receive a{" "}
        <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
          checkoutUrl
        </code>
        , and redirect. Webhooks notify you when the customer completes payment.
      </Callout>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Step 1: Create a checkout session
        </h4>
        <CodeBlock
          label="POST /api/payout-requests"
          code={createSessionExample}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Step 2: Redirect the customer
        </h4>
        <CodeBlock
          label="Response"
          code={sessionResponse}
          maxHeight="max-h-[300px]"
        />
        <Callout tone="warning" className="mt-3">
          Redirect the customer to{" "}
          <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
            data.checkoutUrl
          </code>{" "}
          immediately. Links expire after <strong>15 minutes</strong>.
        </Callout>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Step 3: Handle the result
        </h4>
        <p className="text-sm text-slate-600 mb-3">
          After payment, the customer is redirected to your{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
            redirectUrl
          </code>
          . Always verify the final state via webhook or the status endpoint —
          never trust the redirect alone.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-slate-800">
                Webhook (recommended)
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Subscribe to{" "}
              <code className="bg-white px-1 py-0.5 rounded text-xs font-mono">
                PAY_IN_STATUS_UPDATE
              </code>{" "}
              for the authoritative result.
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Code size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">
                Status API
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Poll{" "}
              <code className="bg-white px-1 py-0.5 rounded text-xs font-mono">
                GET /api/payout-requests/reference/:ref
              </code>{" "}
              to confirm.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          cURL Example
        </h4>
        <CodeBlock label="cURL" code={curlExample} maxHeight="max-h-[300px]" />
      </div>

      <Callout tone="neutral" title="Need more detail?" icon={ExternalLink}>
        Hosted Checkout shares the same authentication, webhook, and status
        codes as the <strong>Direct API → Payin</strong> flow. See those pages
        for full field-level documentation.
      </Callout>
    </div>
  );
}
