import { useRef } from "react";
import {
  ArrowRight,
  Code,
  Download,
  Server,
  Shield,
  Webhook,
} from "lucide-react";
import { PAGE_HEADER, BTN_FILTER } from "../../../../lib/styles";
import Authorization from "../Authorization";
import RequestParams from "./RequestParams";
import MerchantCallback from "./MerchantCallback";
import ResponseCodes from "./ResponseCodes";

export default function DirectApiPayin() {
  const sections = [
    {
      id: "authorization",
      title: "Authentication",
      description: "Login, generate signature & configure headers",
      component: <Authorization apiType="payin" />,
      icon: Shield,
    },
    {
      id: "request",
      title: "Payin Request Parameters",
      description: "Create PayIn & check status",
      component: <RequestParams />,
      icon: Code,
    },
    {
      id: "callback",
      title: "Merchant Callback",
      description: "Request body sent to your webhook URL",
      component: <MerchantCallback />,
      icon: Webhook,
    },
    {
      id: "response",
      title: "Response & Status Codes",
      description: "Possible status codes returned by the API",
      component: <ResponseCodes />,
      icon: Server,
    },
  ];

  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!contentRef.current) return;
    const clone = contentRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("button").forEach((btn) => btn.remove());

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payin API</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; }
            pre { white-space: pre-wrap !important; word-break: break-all !important; font-size: 12px !important; }
            ::-webkit-scrollbar { display: none; }
            body { padding: 20px; background: white; }
          </style>
        </head>
        <body>${clone.outerHTML}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  return (
    <div ref={contentRef} className="space-y-6">
      <div className={`${PAGE_HEADER} print-section`}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payin API — Direct Integration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Create PayIn requests with customer and payment details, get a
            payment link for your customer, and receive real-time webhook
            notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className={BTN_FILTER}>
            <Download size={16} />
            Download PDF
          </button>
          <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium">
            v1.0.0
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden print-section"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-md">
                    <Icon size={18} className="text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {section.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Step {index + 1}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
              <div className="p-6">{section.component}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
