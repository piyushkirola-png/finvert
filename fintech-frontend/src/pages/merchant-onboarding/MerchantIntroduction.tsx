import { Rocket, Shield, Zap, Globe, CheckCircle } from "lucide-react";

export default function MerchantIntroduction() {
  return (
    <>
      {/* Step Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-8 h-8 text-blue-600" />
          <h2 className="text-4xl font-bold text-slate-800">
            Merchant Onboarding
          </h2>
        </div>
        <p className="text-slate-500 text-lg max-w-3xl">
          Get started with our payment gateway platform.
          <br />
          Complete the onboarding process to start accepting payments.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          {
            title: "What is Merchant Onboarding?",
            icon: Shield,
            desc: "Merchant onboarding is the process of registering your business with our payment gateway to enable online payment acceptance. It involves verifying your business identity, setting up payment methods, and configuring your account.",
          },
          {
            title: "Why Onboard?",
            icon: Zap,
            desc: "Once onboarded, you can: Accept payments from customers globally, Access multiple payment methods (Cards, UPI, Net Banking, Wallets), Get faster settlements, and Manage transactions through our dashboard.",
          },
          {
            title: "What You Need?",
            icon: Globe,
            desc: "Business registration documents, GSTIN, Bank account details, KYC documents (Passport, etc.), and basic business information. Everything is securely handled through our platform.",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition"
          >
            <card.icon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="font-semibold text-lg text-slate-800 mb-2">
              {card.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Process Steps */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-2xl">
        <h3 className="text-2xl font-bold text-slate-800 mb-4">
          Onboarding Process
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Complete these 7 steps to finish your merchant onboarding:
        </p>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            "Business Information",
            "Document Upload",
            "KYC Verification",
            "Payment Methods",
            "IP Whitelisting",
            "Rate Management",
            "Review & Submit",
          ].map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </div>
              <span className="text-sm font-medium text-slate-700">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            Secure & Compliant - Your data is safe with us
          </span>
        </div>
      </div>
    </>
  );
}
