import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Download } from "lucide-react";
import { getCurrencySymbol } from "../../utils/currencySymbols";
import {
  useMerchant,
  useMerchantDocuments,
  useMerchantRates,
  useMerchantIPWhitelist,
} from "../../api/queries/useMerchants";
import { useRemoveUserFromMerchant } from "../../api/mutations/merchantMutations";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  PAGE_HEADER,
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

const documentLabels: Record<string, string> = {
  PAN: "PAN Card",
  GST: "GST Certificate",
  BUSINESS_PROOF: "Business Registration Proof",
  CANCELLED_CHEQUE: "Cancelled Cheque",
  BANK_STATEMENT: "Bank Statement",
  PASSPORT: "Passport",
  AADHAAR: "Aadhaar Card",
  DRIVING_LICENSE: "Driving License",
  ADDRESS_PROOF: "Address Proof",
  PRIVACY_POLICY: "Privacy Policy",
  TERMS_CONDITIONS: "Terms & Conditions",
  REFUND_POLICY: "Refund Policy",
  CONTACT_PAGE: "Contact Us Page",
  DIRECTOR_KYC: "Director KYC",
  SHAREHOLDING_PATTERN: "Shareholding Pattern",
  UBO_DECLARATION: "UBO Declaration",
  ADDITIONAL_LICENSE: "Additional Licenses",
  RISK_DECLARATION: "Risk Declaration",
  INCORPORATION_CERT: "Certificate of Incorporation",
  MOA: "Memorandum of Association",
  AOA: "Articles of Association",
  BOARD_RESOLUTION: "Board Resolution",
  PARTNERSHIP_CERT: "Partnership Registration Certificate",
  PARTNERSHIP_DEED: "Partnership Deed",
  UDYAM_CERT: "Udyam/MSME Certificate",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "business", label: "Business Details" },
  { id: "bank", label: "Bank Details" },
  { id: "kyc", label: "KYC Documents" },
  { id: "ipwhitelist", label: "IP Whitelisting" },
  { id: "users", label: "Assigned Users" },
  { id: "rates", label: "Rate Management" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PANEL = "bg-white border border-slate-200 rounded-lg";
const ROW_BTN =
  "h-7 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-[#f5efe0] transition inline-flex items-center gap-1";

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

const SectionHeading = ({ title }: { title: string }) => (
  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-5 mb-2">
    {title}
  </p>
);

const isImageFile = (name?: string, url?: string) => {
  const ext = (name || url || "").split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
};

const isVerified = (doc: any) =>
  doc.verified === true ||
  doc.isVerified === true ||
  doc.status === "VERIFIED" ||
  doc.verificationStatus === "APPROVED";

const docName = (doc: any) =>
  doc.type === "CUSTOM_DOCUMENT" && doc.customName
    ? doc.customName
    : documentLabels[doc.type] || doc.type || "Document";

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "-";

export default function MerchantSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const merchantId = id ? parseInt(id) : 0;

  let userCurrency = "INR";
  try {
    const user = JSON.parse(localStorage.getItem("admin_user") || "null");
    if (user?.defaultCurrency) userCurrency = user.defaultCurrency;
  } catch {
    /* ignore */
  }
  const currencySymbol = getCurrencySymbol(userCurrency);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [removeUserId, setRemoveUserId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showSecret, setShowSecret] = useState(false);

  const { data: data, isLoading: merchantLoading } = useMerchant(merchantId);
  const { data: rates = [], isLoading: ratesLoading } =
    useMerchantRates(merchantId);
  const { data: kycDocuments = [], isLoading: docsLoading } =
    useMerchantDocuments(merchantId);
  const { data: whitelistedIPs = [], isLoading: ipLoading } =
    useMerchantIPWhitelist(merchantId);
  const { mutate: removeUser, isPending: isRemoving } =
    useRemoveUserFromMerchant();

  const isLoading = merchantLoading || ratesLoading || docsLoading || ipLoading;
  const selectedUser = data?.users?.find((u: any) => u.id === removeUserId);

  const handleDownload = async () => {
    if (!selectedDoc?.fileUrl) return;
    try {
      const blob = await (await fetch(selectedDoc.fileUrl)).blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedDoc.fileName || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(selectedDoc.fileUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const statusColor =
    data?.status === "ACTIVE"
      ? "green"
      : data?.status === "PENDING"
        ? "yellow"
        : "red";

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f5efe0] transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Merchant Details
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {data?.merchantName ? `${data.merchantName} • ` : ""}ID: {id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${BADGE} ${BADGE_COLORS[statusColor]}`}>
            {data?.status || "UNKNOWN"}
          </span>
          <span
            className={`${BADGE} ${BADGE_COLORS[data?.planType === "PREMIUM" ? "orange" : "slate"]}`}
          >
            {data?.planType || "BASIC"}
          </span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-base font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#f5efe0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className={`${PANEL} p-6 text-base text-slate-500`}>
          No data available
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className={`${PANEL} px-6 py-4`}>
              <div className="grid md:grid-cols-2 gap-x-12">
                <div>
                  <SectionHeading title="Merchant" />
                  <Field label="Name" value={data.merchantName} />
                  <Field label="Email" value={data.email} />
                  <Field label="Phone" value={data.phone} />
                  <Field label="Status" value={data.status} />
                  <Field label="Webhook URL" value={data.webhookUrl} />
                  <Field
                    label="Webhook Secret"
                    value={
                      data.webhookSecret ? (
                        <div className="flex items-center gap-2">
                          <span className="font">
                            {showSecret ? data.webhookSecret : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowSecret((s) => !s)}
                            className="text-slate-500 hover:text-slate-900 transition"
                          >
                            {showSecret ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      ) : (
                        "-"
                      )
                    }
                  />
                </div>
                <div>
                  <SectionHeading title="Business" />
                  <Field label="Legal Name" value={data.businessName} />
                  <Field label="Business Type" value={data.businessType} />
                  <Field label="Website" value={data.websiteUrl} />
                  <Field label="Contact Person" value={data.contactPerson} />
                  <Field label="Business Phone" value={data.businessPhone} />
                  <Field label="Business Email" value={data.businessEmail} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "business" && (
            <div className={`${PANEL} px-6 py-4`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <Field label="Business Address" value={data.businessAddress} />
                <Field label="City" value={data.city} />
                <Field label="State" value={data.state} />
                <Field label="PIN Code" value={data.pinCode} />
                <Field label="Zone" value={data.zone} />
                <Field label="Country" value={data.operatingCountry} />
                <Field label="PAN Number" value={data.panNumber} />
                <Field label="Name as per PAN" value={data.nameAsPerPan} />
                <Field
                  label="Incorporation Date"
                  value={data.incorporationDate}
                />
                <Field label="GSTIN" value={data.gstin} />
                <Field label="GST Status" value={data.gstStatus} />
                <Field
                  label="Merchant Category"
                  value={data.merchantCategory}
                />
                <Field label="Annual Turnover" value={data.annualTurnover} />
                <Field
                  label="Number of Employees"
                  value={data.numberOfEmployees}
                />
              </div>
            </div>
          )}

          {activeTab === "bank" && (
            <div className={PANEL}>
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Bank Details
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Settlement account information
                </p>
              </div>
              <div className="px-6 py-3 grid md:grid-cols-2 gap-x-12">
                <div>
                  <Field label="Account Name" value={data.bankAccountName} />
                  <Field label="Account Type" value={data.bankAccountType} />
                  <Field label="Bank Name" value={data.bankName} />
                </div>
                <div>
                  <Field label="Account Number" value={data.accountNumber} />
                  <Field label="IFSC Code" value={data.ifscCode} />
                  <Field
                    label="Settlement Currency"
                    value={data.settlementCurrency}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "kyc" && (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap min-w-[700px]">
                  <thead>
                    <tr>
                      <th className={TH}>Document</th>
                      <th className={TH}>File</th>
                      <th className={TH}>Uploaded</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycDocuments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-10 text-base text-slate-500"
                        >
                          No documents uploaded
                        </td>
                      </tr>
                    ) : (
                      kycDocuments.map((doc: any, i: number) => {
                        const verified = isVerified(doc);
                        return (
                          <tr
                            key={i}
                            className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                          >
                            <td
                              className={`${TD} font-semibold text-slate-800`}
                            >
                              {docName(doc)}
                            </td>
                            <td className={`${TD} max-w-[220px] truncate`}>
                              {doc.fileName || "Uploaded file"}
                            </td>
                            <td className={TD}>
                              {fmtDate(doc.verifiedAt || doc.createdAt)}
                            </td>
                            <td className={TD}>
                              <span
                                className={`${BADGE} ${BADGE_COLORS[verified ? "green" : "yellow"]}`}
                              >
                                {verified ? "VERIFIED" : "PENDING"}
                              </span>
                            </td>
                            <td className={TD}>
                              <button
                                onClick={() => setSelectedDoc(doc)}
                                className={ROW_BTN}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "ipwhitelist" && (
            <div className={TABLE_SHELL}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TH}>IP Address</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelistedIPs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="text-center py-10 text-base text-slate-500"
                      >
                        No IP addresses whitelisted. Add IPs from the onboarding
                        page.
                      </td>
                    </tr>
                  ) : (
                    whitelistedIPs.map((ip: string, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                      >
                        <td className={TD_MONO}>{ip}</td>
                        <td className={TD}>
                          <span className={`${BADGE} ${BADGE_COLORS.green}`}>
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "users" && (
            <div className={TABLE_SHELL}>
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr>
                    <th className={TH}>Name</th>
                    <th className={TH}>Email</th>
                    <th className={TH}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.users?.length ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-10 text-base text-slate-500"
                      >
                        No users assigned yet
                      </td>
                    </tr>
                  ) : (
                    data.users.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                      >
                        <td className={`${TD} font-semibold text-slate-800`}>
                          {u.name || u.fullName}
                        </td>
                        <td className={TD}>{u.email}</td>
                        <td className={TD}>
                          <button
                            onClick={() => setRemoveUserId(u.id)}
                            className={`${ROW_BTN} !text-red-600`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "rates" && (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap min-w-[900px]">
                  <thead>
                    <tr>
                      <th className={TH}>Direction</th>
                      <th className={TH}>Gateway ID</th>
                      <th className={TH}>Gateway</th>
                      <th className={TH}>Min</th>
                      <th className={TH}>Max</th>
                      <th className={TH}>Type</th>
                      <th className={TH}>Tax</th>
                      <th className={TH}>Value</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="text-center py-10 text-base text-slate-500"
                        >
                          No rates configured
                        </td>
                      </tr>
                    ) : (
                      rates.map((r: any) => (
                        <tr
                          key={r.id}
                          className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                        >
                          <td className={TD}>
                            <span
                              className={`${BADGE} ${BADGE_COLORS[r.direction === "PAYIN" ? "green" : "blue"]}`}
                            >
                              {r.direction}
                            </span>
                          </td>
                          <td className={TD_MONO}>{r.gatewayId}</td>
                          <td className={TD}>
                            {r.gateway?.gatewayName ||
                              r.gateway?.name ||
                              r.gateway?.gateway_name ||
                              "N/A"}
                          </td>
                          <td className={TD}>
                            {currencySymbol}
                            {r.minAmount}
                          </td>
                          <td className={TD}>
                            {currencySymbol}
                            {r.maxAmount}
                          </td>
                          <td className={TD}>
                            <span
                              className={`${BADGE} ${BADGE_COLORS[r.rateType === "FIXED" ? "purple" : "blue"]}`}
                            >
                              {r.rateType || "N/A"}
                            </span>
                          </td>
                          <td className={TD}>{r.taxRate || 0}%</td>
                          <td className={`${TD} font-semibold`}>
                            {r.rateValue}
                            {r.rateType === "PERCENTAGE" ? "%" : ""}
                          </td>
                          <td className={TD}>
                            <span
                              className={`${BADGE} ${BADGE_COLORS[r.isActive ? "green" : "red"]}`}
                            >
                              {r.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* DOCUMENT MODAL */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className={`${MODAL_SHELL} max-w-6xl w-full max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h3 className="text-base font-semibold text-slate-900">
                {docName(selectedDoc)}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {selectedDoc.fileName || "Uploaded document"}
              </p>
            </div>
            <div className={MODAL_BODY}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-md h-[400px] flex items-center justify-center p-3 overflow-hidden">
                  {selectedDoc.fileUrl ? (
                    isImageFile(selectedDoc.fileName, selectedDoc.fileUrl) ? (
                      <img
                        src={selectedDoc.fileUrl}
                        alt={selectedDoc.fileName}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (selectedDoc.fileName || selectedDoc.fileUrl)
                        .toLowerCase()
                        .endsWith(".pdf") ? (
                      <iframe
                        src={selectedDoc.fileUrl}
                        title={selectedDoc.fileName || "document"}
                        className="w-full h-full rounded-md bg-white"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">
                        Preview not available. Use Download.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-slate-500">
                      No document URL available
                    </p>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <Field label="Type" value={selectedDoc.type} />
                  <Field
                    label="Status"
                    value={
                      <span
                        className={`${BADGE} ${BADGE_COLORS[isVerified(selectedDoc) ? "green" : "yellow"]}`}
                      >
                        {isVerified(selectedDoc) ? "VERIFIED" : "PENDING"}
                      </span>
                    }
                  />
                  <Field
                    label="Uploaded On"
                    value={
                      selectedDoc.createdAt
                        ? new Date(selectedDoc.createdAt).toLocaleString(
                            "en-IN",
                          )
                        : "-"
                    }
                  />
                  <Field label="File Name" value={selectedDoc.fileName} />
                </div>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              {selectedDoc.fileUrl && (
                <button
                  onClick={handleDownload}
                  className={`${ROW_BTN} !h-9 !px-3 !text-sm`}
                >
                  <Download size={14} /> Download
                </button>
              )}
              <button
                onClick={() => setSelectedDoc(null)}
                className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!removeUserId}
        danger
        title="Remove User?"
        message={`Remove ${selectedUser?.name || "this user"} from this merchant? They will lose access.`}
        confirmLabel="Yes, Remove"
        loading={isRemoving}
        onCancel={() => setRemoveUserId(null)}
        onConfirm={() => {
          if (!removeUserId) return;
          removeUser(
            { merchantId, userId: removeUserId },
            { onSuccess: () => setRemoveUserId(null) },
          );
        }}
      />
    </div>
  );
}
