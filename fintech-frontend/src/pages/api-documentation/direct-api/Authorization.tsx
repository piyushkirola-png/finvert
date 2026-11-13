import { useState } from "react";
import { Lock, Shield, User } from "lucide-react";
import { CARD } from "../../../lib/styles";
import CodeBlock from "../../../components/ui/CodeBlock";
import Callout from "../../../components/ui/Callout";

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: number;
      email: string;
      fullName: string;
      role: string;
      merchantId: number;
      clientSecret: string;
    };
  };
}

interface AuthorizationProps {
  apiType?: "payin" | "payout";
  isAdmin?: boolean;
}

const TABS = [
  { key: "login", label: "Login", icon: User },
  { key: "signature", label: "Generate Signature", icon: Shield },
  { key: "headers", label: "Request Headers", icon: Lock },
] as const;

export default function Authorization({
  apiType = "payin",
}: AuthorizationProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("login");

  const loginCredentials = {
    email: "user@example.com",
    password: "your_password",
  };

  const loginResponse: LoginResponse = {
    success: true,
    message: "Login successful",
    data: {
      accessToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzgzOTI4MDk2LCJleHAiOjE3ODY1MjAwOTZ9.abc123def456",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzgzOTI4MDk2LCJleHAiOjE3ODY1MjAwOTZ9.abc123def456",
      user: {
        id: 2,
        email: "user@example.com",
        fullName: "User Name",
        role: "USER",
        merchantId: 1,
        clientSecret:
          "7260743197b59b53995d31d6351cdb784ee24c574cf7a0fxxxxxxxxxx",
      },
    },
  };

  const endpoint = apiType === "payin" ? "/payin-requests" : "/payout-requests";
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const signatureNodeExample = `const crypto = require("crypto");

const clientSecret = process.env.CLIENT_SECRET;      // from login response
const merchantReference = "ORD-123456789";

const signature = crypto
  .createHmac("sha256", clientSecret)
  .update(merchantReference)
  .digest("hex");

// Send in header:  x-signature: <hex digest>`;

  const headersExample = `Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
x-signature: <HMAC_SHA256_HEX_DIGEST>`;

  const curlExample = `# Step 1: Login
curl -X POST ${apiUrl}/auth/user/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"your_password"}'

# Step 2: Generate x-signature (server-side)
node -e 'const c=require("crypto");console.log(c.createHmac("sha256",process.env.CLIENT_SECRET).update("MERCHANT_REF").digest("hex"))'

# Step 3: Call the API
curl -X POST ${apiUrl}${endpoint} \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "x-signature: YOUR_HMAC_SIGNATURE" \\
  -d '{"merchantReference":"MERCHANT_REF","amount":100,...}'`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Our API uses a secure two-step authentication process. First, login to
        get your credentials, then sign every request with an HMAC signature
        derived from your client secret.
      </p>

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

      {/* LOGIN TAB */}
      {activeTab === "login" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Step 1: Authenticate
            </h4>
            <p className="text-sm text-slate-600">
              Send a POST request to the login endpoint with your email and
              password.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodeBlock label="POST /auth/user/login" code={loginCredentials} />
            <CodeBlock
              label="Response"
              code={loginResponse}
              maxHeight="max-h-[300px]"
            />
          </div>

          <Callout tone="success" title="Important: Save These Values">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className={`${CARD} p-3`}>
                <p className="text-xs text-slate-500">Access Token</p>
                <p className="text-xs font-mono text-blue-700 break-all mt-1">
                  {loginResponse.data.accessToken.substring(0, 40)}...
                </p>
                <p className="text-xs text-slate-400 mt-1">Valid for 7 days</p>
              </div>
              <div className={`${CARD} p-3`}>
                <p className="text-xs text-slate-500">Client Secret</p>
                <p className="text-xs font-mono text-purple-700 break-all mt-1">
                  {loginResponse.data.user.clientSecret}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Used to compute x-signature
                </p>
              </div>
            </div>
          </Callout>
        </div>
      )}

      {/* SIGNATURE TAB */}
      {activeTab === "signature" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Step 2: Generate the x-signature
            </h4>
            <p className="text-sm text-slate-600">
              The{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
                x-signature
              </code>{" "}
              header is an <strong>HMAC-SHA256 hex digest</strong> of the{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
                merchantReference
              </code>{" "}
              signed with your <strong>Client Secret</strong>. It is{" "}
              <em>not</em> the raw secret.
            </p>
          </div>

          <Callout tone="warning" title="How x-signature works">
            <ul className="space-y-1 list-disc list-inside">
              <li>
                Compute{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
                  HMAC-SHA256(clientSecret, merchantReference)
                </code>
              </li>
              <li>Encode the result as lowercase hex</li>
              <li>
                Send it in the{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
                  x-signature
                </code>{" "}
                header of every request
              </li>
              <li>
                Never expose your client secret in browser/client-side code
              </li>
            </ul>
          </Callout>

          <CodeBlock
            label="Node.js — signature generation"
            code={signatureNodeExample}
          />

          <Callout tone="info" title="Signature Checklist" icon={Shield}>
            <ol className="space-y-1 list-decimal list-inside">
              <li>
                Login → receive <strong>clientSecret</strong> and{" "}
                <strong>accessToken</strong>
              </li>
              <li>Store the secret securely on your server (env variable)</li>
              <li>
                For every request compute HMAC-SHA256(secret, merchantReference)
              </li>
              <li>
                Send the hex digest in{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">
                  x-signature
                </code>
              </li>
              <li>Server verifies signature before processing</li>
            </ol>
          </Callout>
        </div>
      )}

      {/* HEADERS TAB */}
      {activeTab === "headers" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Step 3: Required Headers
            </h4>
            <p className="text-sm text-slate-600">
              Every API request must include these headers for authentication
              and verification.
            </p>
          </div>

          <CodeBlock label="Request Headers" code={headersExample} />

          <div className="space-y-3">
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-mono text-sm min-w-[130px]">
                  Authorization:
                </span>
                <span className="text-green-400 font-mono text-sm break-all">
                  Bearer {loginResponse.data.accessToken.substring(0, 30)}...
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-[130px]">
                JWT from login response
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-mono text-sm min-w-[130px]">
                  Content-Type:
                </span>
                <span className="text-green-400 font-mono text-sm">
                  application/json
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-[130px]">
                Indicates JSON payload format
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-3 border-l-2 border-purple-500">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-mono text-sm min-w-[130px]">
                  x-signature:
                </span>
                <span className="text-purple-400 font-mono text-sm break-all">
                  &lt;hex(HMAC_SHA256(clientSecret, merchantReference))&gt;
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-[130px]">
                Hex digest — NOT the raw client secret
              </p>
            </div>
          </div>

          <Callout tone="danger" title="Important Security Note">
            Never expose your <strong>Client Secret</strong> or{" "}
            <strong>Access Token</strong> in client-side code. Store them
            securely on your server and use environment variables. The{" "}
            <strong>x-signature</strong> must always be computed server-side.
          </Callout>
        </div>
      )}

      {/* Complete cURL */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Complete cURL Example
        </h4>
        <CodeBlock label="cURL" code={curlExample} maxHeight="max-h-[400px]" />
      </div>
    </div>
  );
}
