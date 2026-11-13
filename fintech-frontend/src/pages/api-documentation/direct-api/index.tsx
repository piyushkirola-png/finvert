import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CARD } from "../../../lib/styles";
import Callout from "../../../components/ui/Callout";

export default function DirectApiOverview() {
  const cards = [
    {
      title: "Payin API",
      description:
        "Collect payments from your customers using card, UPI, netbanking or wallet. Includes payment link generation and webhook notifications.",
      path: "/api-documentation/direct-api/payin",
      icon: ArrowDownCircle,
      bullets: [
        "Create PayIn requests with customer & payment details",
        "Get a payment link for your customers",
        "Real-time webhook events: PAY_IN_STATUS_UPDATE",
      ],
    },
    {
      title: "Payout API",
      description:
        "Send payouts directly to beneficiaries — bank accounts, UPI IDs. Immediate status and signed webhook updates.",
      path: "/api-documentation/direct-api/payout",
      icon: ArrowUpCircle,
      bullets: [
        "Create Payout requests with beneficiary details",
        "Fee, GST and amount-to-debit calculated automatically",
        "Real-time webhook events: PAY_OUT_STATUS_UPDATE",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-lg px-6 py-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/10 p-2 rounded-md">
                <BookOpen size={24} className="text-white" />
              </div>
              <h1 className="text-xl font-semibold">Direct API</h1>
            </div>
            <p className="text-slate-300 text-sm">
              Server-to-server integration for Payin and Payout
            </p>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Direct API lets your backend create payments and payouts securely
              with HMAC-signed requests — no redirects, no hosted pages. Choose
              a product below to get started.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-md px-3 py-1.5">
            <span className="text-xs font-medium">v1.0.0</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.path}
              to={card.path}
              className={`${CARD} p-6 group hover:shadow-md hover:border-slate-300 transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-md bg-slate-100">
                  <Icon size={22} className="text-slate-700" />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all"
                />
              </div>

              <h2 className="text-lg font-semibold text-slate-900 mt-4">
                {card.title}
              </h2>
              <p className="text-sm text-slate-600 mt-2">{card.description}</p>

              <ul className="mt-4 space-y-1.5">
                {card.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="text-sm text-slate-600 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-900 group-hover:gap-3 transition-all">
                Open {card.title} docs
                <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      <Callout tone="info" title="What is Direct API?" icon={BookOpen}>
        Direct API is a server-to-server integration where your backend calls
        our endpoints directly, secured by HMAC signatures. Every request is
        signed with your client secret. Webhooks keep your system informed about
        status changes in real time.
      </Callout>
    </div>
  );
}
