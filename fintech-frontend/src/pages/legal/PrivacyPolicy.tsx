import {
  Shield,
  Lock,
  Eye,
  Database,
  Globe,
  Mail,
  Server,
  Cookie,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { CARD, PAGE_HEADER } from "../../lib/styles";
import Callout from "../../components/ui/Callout";

const sections = [
  {
    icon: Shield,
    title: "1. Introduction",
    content: [
      "Decor Vault ('we', 'our', 'us') is committed to protecting your privacy and personal information.",
      "This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our payment orchestration platform.",
      "By using our services, you consent to the data practices described in this policy.",
    ],
  },
  {
    icon: Database,
    title: "2. Information We Collect",
    content: [
      "Business Information: Legal business name, business address, business registration number, GSTIN, and business type.",
      "Personal Information: Full name, email address, phone number, date of birth, and government-issued identification (PAN, Aadhaar, Passport).",
      "Financial Information: Bank account details, bank statements, transaction history, and settlement information.",
      "Technical Information: IP address, browser type, device information, cookies, and usage data.",
      "Payment Information: Transaction details, payment amounts, currency, payment methods, and gateway information.",
    ],
  },
  {
    icon: Lock,
    title: "3. How We Use Your Information",
    content: [
      "Process payments, payouts, and settlements through our payment gateway partners.",
      "Verify your identity and comply with KYC, AML, and regulatory requirements.",
      "Provide, maintain, and improve our services, including fraud detection and risk management.",
      "Communicate with you about your account, transactions, and service updates.",
      "Analyze usage patterns to improve user experience and platform performance.",
      "Comply with legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    icon: Server,
    title: "4. Data Storage & Security",
    content: [
      "All data is encrypted using industry-standard encryption (TLS 1.3, AES-256) in transit and at rest.",
      "We use secure cloud infrastructure with multiple layers of security, firewalls, and intrusion detection.",
      "Sensitive financial data is tokenized and stored in PCI DSS compliant vaults.",
      "Access to personal data is strictly limited to authorized personnel with legitimate business needs.",
      "We regularly conduct security audits, penetration testing, and vulnerability assessments.",
    ],
  },
  {
    icon: Users,
    title: "5. Information Sharing & Disclosure",
    content: [
      "Payment Gateways: Razorpay, Cashfree, Adyen, Stripe, PayU, and other partners to process transactions.",
      "Banking Partners: To process settlements, payouts, and manage funds.",
      "Regulatory Bodies: When required by law, to comply with legal obligations, KYC, and AML regulations.",
      "Service Providers: We work with trusted third-party providers for hosting, analytics, and support.",
      "We do not sell, rent, or trade your personal information to third parties for marketing purposes.",
    ],
  },
  {
    icon: Globe,
    title: "6. Data Retention",
    content: [
      "Transaction data is retained for 7 years to comply with regulatory and tax requirements.",
      "Personal information is retained as long as your account is active or as needed to provide services.",
      "You may request deletion of your data in accordance with applicable laws.",
      "Retention periods are based on legal obligations, business requirements, and user preferences.",
    ],
  },
  {
    icon: Eye,
    title: "7. Your Rights (GDPR & Data Protection)",
    content: [
      "Right to Access: You can request a copy of the personal data we hold about you.",
      "Right to Rectification: You can request correction of inaccurate or incomplete data.",
      "Right to Erasure: You can request deletion of your data under certain circumstances.",
      "Right to Restrict Processing: You can request restrictions on how we process your data.",
      "Right to Data Portability: You can request to receive your data in a structured format.",
      "Right to Object: You can object to the processing of your data for specific purposes.",
    ],
  },
  {
    icon: Cookie,
    title: "8. Cookies & Tracking Technologies",
    content: [
      "We use cookies to improve user experience, remember preferences, and analyze usage.",
      "Essential cookies are necessary for platform functionality and cannot be disabled.",
      "Analytics cookies help us understand how users interact with our platform.",
      "You can manage your cookie preferences in your browser settings.",
      "We use session and persistent cookies for authentication and security purposes.",
    ],
  },
  {
    icon: CheckCircle,
    title: "9. Children's Privacy",
    content: [
      "Our services are not intended for individuals under the age of 18.",
      "We do not knowingly collect personal information from minors.",
      "If we discover that we have collected data from a minor, we will take steps to delete it immediately.",
      "Parents or guardians can contact us to request deletion of their child's information.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "10. Updates to This Policy",
    content: [
      "We may update this Privacy Policy periodically to reflect changes in our practices or regulations.",
      "We will notify you of significant changes via email or through platform notifications.",
      "The 'Last Updated' date at the top of this policy indicates when it was last revised.",
      "Continued use of our services after changes constitutes your acceptance of the updated policy.",
    ],
  },
  {
    icon: Mail,
    title: "11. Contact Us",
    content: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:",
      "Email: info@decorvault.online",
      "Address: Decor Vault, Delhi, India",
      "We will respond to your inquiry within 30 days.",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Last updated: August 10, 2026 • Effective: August 10, 2026
          </p>
        </div>
        <div className="p-3 bg-slate-100 rounded-md">
          <Shield size={20} className="text-slate-700" />
        </div>
      </div>

      <Callout tone="info">
        <strong className="text-slate-800">Your privacy matters to us.</strong>{" "}
        This Privacy Policy explains how Decor Vault collects, uses, and
        protects your personal information when you use our payment
        orchestration platform. We are committed to transparency and
        safeguarding your data.
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
            <Shield size={14} /> GDPR Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} /> PCI DSS Compliant
          </span>
        </div>
      </div>
    </div>
  );
}
