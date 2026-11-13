import { BADGE, BADGE_COLORS } from "../../lib/styles";

interface Props {
  formData: any;
  documents: Record<string, any>;
  documentList: Array<{ key: string; label: string; required: boolean }>;
  ips: string[];
  rates: any[];
}

// Reusable field row
const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-500 w-40 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-base font-medium flex-1 text-slate-900 break-all ${mono ? "font-mono" : ""}`}
    >
      {value || "-"}
    </span>
  </div>
);

// Reusable section wrapper
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-slate-200 rounded-lg min-h-[350px] flex flex-col">
    <div className="px-8 py-5 border-b border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    <div className="px-8 py-4 flex-1">{children}</div>
  </div>
);

export default function ReviewSubmit({
  formData,
  documents,
  documentList,
  ips,
  rates,
}: Props) {
  const requiredDocs = documentList.filter((d) => d.required);
  const missing = requiredDocs.filter((d) => !documents[d.key]?.fileUrl);
  const uploadedCount = Object.values(documents).filter(
    (d: any) => d?.fileUrl,
  ).length;

  // 6 Static Checks for the top section
  const checks = [
    {
      label: "Basic information",
      ok: !!(formData.merchantName && formData.email && formData.phone),
    },
    {
      label: "Business information",
      ok: !!(formData.businessName && formData.businessType),
    },
    { label: "Required documents uploaded", ok: missing.length === 0 },
    {
      label: "Bank details",
      ok: !!(formData.bankName && formData.accountNumber && formData.ifscCode),
    },
    { label: "IP addresses whitelisted", ok: ips.length > 0 },
    { label: "Rates configured", ok: rates.length > 0 },
  ];

  return (
    <div className="space-y-8">
      {/* TOP CHECKLIST CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-lg min-h-[250px] flex flex-col">
        <div className="px-8 py-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Review & Submit
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {missing.length > 0
              ? `Missing required documents: ${missing.map((d) => d.label).join(", ")}`
              : "Review everything below, then complete onboarding."}
          </p>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          {checks.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-between gap-3 px-4 h-14 rounded-md border border-slate-200 text-sm text-slate-700 bg-slate-50/50"
            >
              <span className="font-medium truncate">{c.label}</span>
              <span
                className={`${BADGE} ${BADGE_COLORS[c.ok ? "green" : "yellow"]} shrink-0`}
              >
                {c.ok ? "DONE" : "PENDING"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* DATA SECTIONS GRID */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 1. MERCHANT (Basic) */}
        <Section title="Merchant Details">
          <Field label="Name" value={formData.merchantName} />
          <Field label="Email" value={formData.email} />
          <Field label="Phone" value={formData.phone} mono />
          <Field label="Status" value={formData.status} />
          <Field label="Webhook URL" value={formData.webhookUrl} />
        </Section>

        {/* 2. BUSINESS INFO */}
        <Section title="Business Information">
          <Field label="Legal Name" value={formData.businessName} />
          <Field label="Business Type" value={formData.businessType} />
          <Field label="Website" value={formData.websiteUrl} />
          <Field label="Contact Person" value={formData.contactPerson} />
          <Field label="Business Phone" value={formData.businessPhone} mono />
          <Field label="Business Email" value={formData.businessEmail} />
          <Field label="Address" value={formData.businessAddress} />
          <Field
            label="City / State / PIN"
            value={`${formData.city || "-"}, ${formData.state || "-"} - ${formData.pinCode || "-"}`}
          />
          <Field
            label="Zone / Country"
            value={`${formData.zone || "-"} / ${formData.operatingCountry || "-"}`}
          />
        </Section>

        {/* 3. STATUTORY (PAN / GST) */}
        <Section title="Statutory Details">
          <Field label="PAN Number" value={formData.panNumber} mono />
          <Field label="Name as per PAN" value={formData.nameAsPerPan} />
          <Field
            label="Incorporation Date"
            value={formData.incorporationDate}
          />
          <Field label="GSTIN" value={formData.gstin} mono />
          <Field label="GST Status" value={formData.gstStatus} />
          <Field label="Merchant Category" value={formData.merchantCategory} />
          <Field label="Annual Turnover" value={formData.annualTurnover} />
          <Field label="Employees" value={formData.numberOfEmployees} />
        </Section>

        {/* 4. BANK DETAILS */}
        <Section title="Bank Account Details">
          <Field label="Account Name" value={formData.bankAccountName} />
          <Field label="Account Type" value={formData.bankAccountType} />
          <Field label="Bank Name" value={formData.bankName} />
          <Field label="Account Number" value={formData.accountNumber} mono />
          <Field label="IFSC Code" value={formData.ifscCode} mono />
          <Field
            label="Settlement Currency"
            value={formData.settlementCurrency}
          />
        </Section>

        {/* 5. DOCUMENTS */}
        <Section title="Documents Uploaded">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-500">
              Total Documents
            </span>
            <span className="text-base font-semibold text-slate-900">
              {uploadedCount}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-500">
              Required Missing
            </span>
            <span
              className={`text-base font-semibold ${missing.length === 0 ? "text-green-600" : "text-red-600"}`}
            >
              {missing.length}
            </span>
          </div>
          <div className="py-3">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Required List:
            </p>
            <ul className="space-y-1.5">
              {requiredDocs.map((d) => (
                <li
                  key={d.key}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${documents[d.key]?.fileUrl ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                  {d.label}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* 6. IP & RATES */}
        <Section title="Network & Rates">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-500">
              Whitelisted IPs
            </span>
            <span className="text-base font-semibold text-slate-900">
              {ips.length}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-500">
              Configured Rates
            </span>
            <span className="text-base font-semibold text-slate-900">
              {rates.length}
            </span>
          </div>
          {ips.length > 0 && (
            <div className="pt-3">
              <p className="text-sm font-medium text-slate-500 mb-2">
                IP Addresses:
              </p>
              <div className="flex flex-wrap gap-2">
                {ips.map((ip) => (
                  <span
                    key={ip}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono"
                  >
                    {ip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
