import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api-client";
import {
  PAGE_HEADER,
  CARD,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_REFRESH,
  BTN_FILTER,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

interface Document {
  id: number;
  merchantId: number;
  type: string;
  customName?: string;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const documentLabels: Record<string, string> = {
  PASSPORT: "Passport",
  GST: "GST Certificate",
  BUSINESS_PROOF: "Business Registration Proof",
  CANCELLED_CHEQUE: "Cancelled Cheque",
  BANK_STATEMENT: "Bank Statement",
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
  CUSTOM_DOCUMENT: "Custom Document",
};

type BadgeTone = keyof typeof BADGE_COLORS;

const statusConfigMap: Record<
  string,
  { label: string; icon: typeof CheckCircle2; tone: BadgeTone; color: string }
> = {
  VERIFIED: {
    label: "Verified",
    icon: CheckCircle2,
    tone: "green",
    color: "text-green-600",
  },
  PENDING: {
    label: "Waiting for Verification",
    icon: Clock,
    tone: "yellow",
    color: "text-yellow-600",
  },
  UPLOADED: {
    label: "Waiting for Verification",
    icon: Clock,
    tone: "yellow",
    color: "text-yellow-600",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    tone: "red",
    color: "text-red-600",
  },
};

const getStatusConfig = (status: string) =>
  statusConfigMap[status] ?? {
    label: status || "Unknown",
    icon: AlertCircle,
    tone: "slate" as BadgeTone,
    color: "text-slate-600",
  };

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isImageFile = (fileName?: string) => {
  if (!fileName) return false;
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "");
};

const getDocumentLabel = (doc: Document) =>
  doc.type === "CUSTOM_DOCUMENT" && doc.customName
    ? doc.customName
    : documentLabels[doc.type] || doc.type || "Document";

type TabKey = "verified" | "pending" | "rejected";

export default function Documentation() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("verified");

  useEffect(() => {
    const userStr =
      localStorage.getItem("user_user") || localStorage.getItem("user");
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const id = user?.merchantId || user?.id || user?.merchant?.id;
      setMerchantId(id ?? null);
      if (!id) toast.error("Merchant ID not found. Please login again.");
    } catch (e) {
      console.error("Failed to parse user data:", e);
    }
  }, []);

  const fetchDocuments = useCallback(
    async (showToast = false) => {
      if (!merchantId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/merchant-documents/${merchantId}`);
        setDocuments(data.data || []);
        if (showToast) toast.success("Documents refreshed");
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to load documents",
        );
      } finally {
        setLoading(false);
      }
    },
    [merchantId],
  );

  useEffect(() => {
    if (merchantId) fetchDocuments();
  }, [merchantId, fetchDocuments]);

  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setShowDocModal(true);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(doc.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.fileName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(doc.fileUrl, "_blank");
    }
  };

  const verifiedDocs = documents.filter((d) => d.status === "VERIFIED");
  const pendingDocs = documents.filter(
    (d) => d.status === "PENDING" || d.status === "UPLOADED",
  );
  const rejectedDocs = documents.filter((d) => d.status === "REJECTED");

  const statCards = [
    {
      label: "Verified Documents",
      value: verifiedDocs.length,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
      tab: "verified" as TabKey,
    },
    {
      label: "Pending Verification",
      value: pendingDocs.length,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
      tab: "pending" as TabKey,
    },
    {
      label: "Rejected Documents",
      value: rejectedDocs.length,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
      tab: "rejected" as TabKey,
    },
  ];

  const tabs: {
    key: TabKey;
    title: string;
    docs: Document[];
    icon: typeof CheckCircle2;
    tone: BadgeTone;
  }[] = [
    {
      key: "verified",
      title: "Verified",
      docs: verifiedDocs,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      key: "pending",
      title: "Pending Verification",
      docs: pendingDocs,
      icon: Clock,
      tone: "yellow",
    },
    {
      key: "rejected",
      title: "Rejected",
      docs: rejectedDocs,
      icon: XCircle,
      tone: "red",
    },
  ];

  const activeTabData = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Document Status
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your document verification status
          </p>
        </div>
        <button
          onClick={() => fetchDocuments(true)}
          disabled={loading}
          className={BTN_REFRESH}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={STAT_CARD}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p
                    className={`text-xl font-semibold mt-1 ${card.valueClass}`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`${STAT_ICON_WRAP} ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABS + LARGE CONTENT */}
      <div className={CARD}>
        {/* Tabs bar */}
        <div className="border-b border-slate-200 flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 ${
                  isActive
                    ? "border-slate-900 text-slate-900 bg-slate-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {tab.title}
                <span className={`${BADGE} ${BADGE_COLORS[tab.tone]}`}>
                  {tab.docs.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : activeTabData.docs.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto text-slate-300 mb-3" size={44} />
              <p className="text-sm text-slate-600">
                No {activeTabData.title.toLowerCase()} documents
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Documents will appear here once uploaded
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeTabData.docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onView={handleViewDocument}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showDocModal && selectedDoc && (
        <DocumentViewModal
          doc={selectedDoc}
          onClose={() => setShowDocModal(false)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

/* ---------- Document Card (larger) ---------- */

function DocumentCard({
  doc,
  onView,
  onDownload,
}: {
  doc: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
}) {
  const cfg = getStatusConfig(doc.status);
  const StatusIcon = cfg.icon;

  return (
    <div
      className={`${CARD} p-5 hover:shadow-sm hover:border-slate-300 transition min-h-[160px] flex flex-col`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold text-slate-900 truncate">
              {getDocumentLabel(doc)}
            </h4>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {doc.fileName || "Document"}
            </p>
          </div>
        </div>
        <span className={`${BADGE} ${BADGE_COLORS[cfg.tone]} flex-shrink-0`}>
          <StatusIcon size={12} />
          {cfg.label}
        </span>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {formatDate(doc.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onView(doc)}
            className="p-2 rounded-md hover:bg-slate-100 transition text-slate-600"
            title="View Document"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => onDownload(doc)}
            className="p-2 rounded-md hover:bg-slate-100 transition text-slate-600"
            title="Download"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Document View Modal ---------- */

function DocumentViewModal({
  doc,
  onClose,
  onDownload,
}: {
  doc: Document;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) {
  const cfg = getStatusConfig(doc.status);
  const StatusIcon = cfg.icon;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {getDocumentLabel(doc)}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-slate-500">
                  {doc.fileName || "Document"}
                </p>
                <span className={`${BADGE} ${BADGE_COLORS[cfg.tone]}`}>
                  <StatusIcon size={12} />
                  {cfg.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 transition text-slate-500"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={MODAL_BODY}>
          {doc.fileUrl ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[300px] flex flex-col items-center justify-center">
                {isImageFile(doc.fileName) ? (
                  <img
                    src={doc.fileUrl}
                    alt={doc.fileName}
                    className="max-w-full max-h-[500px] object-contain rounded-md"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-700 mb-3">
                      {doc.fileName || "Document"}
                    </p>
                    <button
                      onClick={() => onDownload(doc)}
                      className={`${BTN_FILTER} mx-auto`}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Document Type</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {doc.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`font-medium mt-0.5 ${cfg.color}`}>
                    {cfg.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Uploaded On</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">File Name</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {doc.fileName || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No document preview available
            </p>
          )}
        </div>

        <div className={MODAL_FOOTER}>
          <button onClick={() => onDownload(doc)} className={BTN_FILTER}>
            <Download size={16} />
            Download
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
