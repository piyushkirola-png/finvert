import {
  FileText,
  CreditCard,
  Shield,
  Scale,
  AlertTriangle,
  Mail,
  Globe,
  Users,
} from "lucide-react";
import { CARD, PAGE_HEADER } from "../../lib/styles";
import Callout from "../../components/ui/Callout";

const sections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using Decor Vault's payment orchestration platform ('Service'), you agree to be bound by these Terms of Service ('Terms').",
      "If you do not agree to these Terms, you must not access or use the Service.",
      "These Terms apply to all visitors, users, and others who access or use the Service.",
      "We may revise these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.",
    ],
  },
  {
    icon: CreditCard,
    title: "2. Service Description",
    content: [
      "Decor Vault provides a payment orchestration platform that connects merchants to multiple payment gateways through a single API.",
      "Our services include payment processing, payout management, settlement processing, risk management, and developer APIs.",
      "We act as a technology provider and orchestrator. We are not a bank, payment gateway, or financial institution.",
      "Payment processing is handled by our partner gateways (Stripe, Razorpay, Cashfree, Adyen, PayU, BennuPay, Chargebee).",
    ],
  },
  {
    icon: Users,
    title: "3. Account Registration & KYC",
    content: [
      "You must provide accurate, complete, and current information during the registration process.",
      "You must complete our KYC verification process before activating your account for live transactions.",
      "You are responsible for maintaining the security of your account credentials and API keys.",
      "You must be at least 18 years old and have the legal authority to bind your business to these Terms.",
      "We reserve the right to refuse or terminate accounts that fail KYC verification or violate our policies.",
    ],
  },
  {
    icon: CreditCard,
    title: "4. Fees & Payment",
    content: [
      "Transaction fees are charged as a percentage of each successful transaction, as described in your pricing plan.",
      "There are no setup fees or monthly fees on Starter and Growth plans.",
      "Fees are automatically deducted from your settlement amount.",
      "Enterprise customers have custom pricing as negotiated in their service agreement.",
      "You are responsible for all taxes associated with your use of the Service, except for taxes on our net income.",
    ],
  },
  {
    icon: Shield,
    title: "5. Acceptable Use",
    content: [
      "You must not use the Service for illegal activities, including but not limited to money laundering, fraud, or terrorism financing.",
      "You must not process payments for prohibited businesses, including weapons, drugs, gambling (where illegal), or adult content.",
      "You must not attempt to reverse engineer, decompile, or disassemble any part of the Service.",
      "You must not use the Service to send spam, phishing, or unsolicited communications.",
      "You must comply with all applicable laws, including PCI DSS, KYC, AML, and data protection regulations.",
    ],
  },
  {
    icon: Scale,
    title: "6. Intellectual Property",
    content: [
      "The Service, including its design, code, content, and branding, is owned by Decor Vault and protected by intellectual property laws.",
      "You may not copy, modify, distribute, or create derivative works of the Service without our written permission.",
      "SDKs and documentation are provided under a limited license for use with the Service.",
      "All trademarks, service marks, and logos are the property of their respective owners.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "7. Limitation of Liability",
    content: [
      "The Service is provided 'as is' and 'as available' without warranties of any kind.",
      "We are not liable for indirect, incidental, special, consequential, or punitive damages.",
      "Our total liability shall not exceed the total transaction fees paid by you in the 3 months preceding the claim.",
      "We are not liable for gateway failures, bank delays, or issues outside our control.",
      "We are not liable for any loss of data, revenue, or business opportunity resulting from the use of the Service.",
    ],
  },
  {
    icon: FileText,
    title: "8. Termination",
    content: [
      "You may terminate your account at any time by contacting us.",
      "We may suspend or terminate your account if you violate these Terms or our policies.",
      "We may terminate your account immediately if we suspect fraud, illegal activity, or security risks.",
      "Upon termination, you remain responsible for all fees incurred prior to termination.",
      "Provisions relating to liability, intellectual property, and dispute resolution survive termination.",
    ],
  },
  {
    icon: Scale,
    title: "9. Dispute Resolution",
    content: [
      "Any disputes arising from these Terms shall first be resolved through good-faith negotiation.",
      "If negotiation fails, disputes shall be resolved through binding arbitration in Delhi, India.",
      "These Terms are governed by the laws of India, without regard to conflict of law principles.",
      "You waive the right to participate in class action lawsuits or class-wide arbitration.",
    ],
  },
  {
    icon: Mail,
    title: "10. Contact Information",
    content: [
      "For legal notices, send to: Decor Vault, Delhi, India.",
      "For support inquiries, contact info@decorvault.online.",
      "For privacy questions, contact info@decorvault.online.",
    ],
  },
];

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Last updated: August 10, 2026 • Effective: August 10, 2026
          </p>
        </div>
        <div className="p-3 bg-slate-100 rounded-md">
          <FileText size={20} className="text-slate-700" />
        </div>
      </div>

      <Callout tone="info">
        <strong className="text-slate-800">Welcome to Decor Vault.</strong>{" "}
        These Terms of Service ("Terms") govern your access to and use of Decor
        Vault's payment orchestration platform, website, and services. By using
        our services, you agree to these Terms.
      </Callout>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className={`${CARD} p-6`}>
              <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-slate-100 rounded-md">
                  <Icon size={18} className="text-slate-700" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-2 pl-1">
                {section.content.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed"
                  >
                    <span className="text-slate-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 py-4 text-sm text-slate-500 border-t border-slate-200">
        <p>
          © 2026 <span className="font-medium text-slate-700">Decor Vault</span>
          . All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Shield size={14} /> Version 2.0
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={14} /> India
          </span>
        </div>
      </div>
    </div>
  );
}
