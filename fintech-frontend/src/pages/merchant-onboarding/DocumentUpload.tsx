import { useState } from "react";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import {
  useUploadDocument,
  useDeleteDocument,
  useVerifyDocument,
  useRejectDocument,
} from "../../api/mutations/merchantOnboardingMutations";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  TABLE_SHELL,
  TH,
  TD,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_PRIMARY,
} from "../../lib/styles";

interface Props {
  documents: Record<string, any>;
  setDocuments: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  activeDocs: string[];
  setActiveDocs: React.Dispatch<React.SetStateAction<string[]>>;
  documentList: Array<{ key: string; label: string; required: boolean }>;
  documentTypeMap: Record<string, string>;
  merchantId?: string;
}

const ROW_BTN =
  "h-8 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50 inline-flex items-center cursor-pointer";
const MAX_SIZE = 5 * 1024 * 1024;

export default function DocumentUpload({
  documents,
  setDocuments,
  activeDocs,
  setActiveDocs,
  documentList,
  documentTypeMap,
  merchantId,
}: Props) {
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [verifyKey, setVerifyKey] = useState<string | null>(null);
  const [rejectKey, setRejectKey] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);

  const { mutate: uploadDocument, isPending: isUploading } =
    useUploadDocument();
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument();
  const { mutate: verifyDocument, isPending: isVerifying } =
    useVerifyDocument();
  const { mutate: rejectDocument, isPending: isRejecting } =
    useRejectDocument();

  const meta = (key: string) => documentList.find((d) => d.key === key);
  const labelOf = (key: string) =>
    meta(key)?.label ||
    documents[key]?.customName ||
    key.replace("custom_", "");

  const handleUpload = (key: string, file: File) => {
    if (file.size > MAX_SIZE)
      return toast.error("File size should be less than 5MB");
    const existing = documents[key];
    const isCustom = key.startsWith("custom_") || existing?.isCustom;
    const docType = isCustom ? "CUSTOM_DOCUMENT" : documentTypeMap[key];
    if (!docType) return toast.error("Invalid document type");

    uploadDocument(
      {
        merchantId: Number(merchantId),
        docType,
        customName: isCustom
          ? existing?.customName || key.replace("custom_", "")
          : undefined,
        file,
      },
      {
        onSuccess: (data: any) => {
          const docKey =
            isCustom && data?.customName ? `custom_${data.customName}` : key;
          setDocuments((prev) => ({
            ...prev,
            [docKey]: {
              fileUrl: data?.fileUrl || "",
              fileName: file.name,
              fileId: data?.id,
              type: data?.type || docType,
              status: data?.status || "PENDING",
              ...(isCustom && {
                customName:
                  data?.customName ||
                  existing?.customName ||
                  key.replace("custom_", ""),
                isCustom: true,
              }),
            },
          }));
        },
      },
    );
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return toast.error("Please enter document name");
    if (!customFile) return toast.error("Please select a file to upload");
    if (customFile.size > MAX_SIZE)
      return toast.error("File size should be less than 5MB");

    uploadDocument(
      {
        merchantId: Number(merchantId),
        docType: "CUSTOM_DOCUMENT",
        customName: customName.trim(),
        file: customFile,
      },
      {
        onSuccess: (data: any) => {
          const saved = data?.customName || customName.trim();
          const key = `custom_${saved}`;
          setDocuments((prev) => ({
            ...prev,
            [key]: {
              fileUrl: data?.fileUrl || "",
              fileName: customFile.name,
              fileId: data?.id,
              type: "CUSTOM_DOCUMENT",
              customName: saved,
              isCustom: true,
              status: data?.status || "PENDING",
            },
          }));
          setActiveDocs((prev) => (prev.includes(key) ? prev : [...prev, key]));
          setCustomOpen(false);
          setCustomName("");
          setCustomFile(null);
        },
      },
    );
  };

  const removeFromState = (key: string) => {
    setActiveDocs((prev) => prev.filter((d) => d !== key));
    setDocuments((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const confirmDelete = () => {
    if (!deleteKey) return;
    const doc = documents[deleteKey];
    if (!doc?.fileUrl) {
      removeFromState(deleteKey);
      setDeleteKey(null);
      return toast.success("Document removed from list");
    }
    const isCustom = doc?.isCustom || doc?.type === "CUSTOM_DOCUMENT";
    const docType = isCustom ? "CUSTOM_DOCUMENT" : documentTypeMap[deleteKey];
    if (!docType) return toast.error("Invalid document type");

    deleteDocument(
      {
        merchantId: merchantId || "",
        docType,
        customName: isCustom ? doc?.customName : undefined,
      },
      {
        onSuccess: () => {
          removeFromState(deleteKey);
          setDeleteKey(null);
        },
      },
    );
  };

  const confirmVerify = () => {
    if (!verifyKey) return;
    const doc = documents[verifyKey];
    if (!doc?.fileId) return toast.error("Document not found");
    verifyDocument(
      {
        merchantId: merchantId || "",
        type: doc.type,
        customName: doc.customName || null,
      },
      {
        onSuccess: () => {
          setDocuments((prev) => ({
            ...prev,
            [verifyKey]: {
              ...prev[verifyKey],
              status: "VERIFIED",
              verified: true,
            },
          }));
          setVerifyKey(null);
        },
      },
    );
  };

  const confirmReject = () => {
    if (!rejectKey) return;
    const doc = documents[rejectKey];
    if (!doc?.fileId) return toast.error("Document not found");
    rejectDocument(
      {
        merchantId: merchantId || "",
        type: doc.type,
        customName: doc.customName || null,
      },
      {
        onSuccess: () => {
          setDocuments((prev) => ({
            ...prev,
            [rejectKey]: { ...prev[rejectKey], status: "REJECTED" },
          }));
          setRejectKey(null);
        },
      },
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload required KYC documents. PDF, JPG or PNG, max 5MB each.
            </p>
          </div>
          <button
            onClick={() => setCustomOpen(true)}
            className={`${BTN_PRIMARY} h-10 px-5 text-sm`}
          >
            <Plus size={16} /> Add Custom Document
          </button>
        </div>

        <div className={TABLE_SHELL + " !border-0 !rounded-none"}>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap min-w-[800px]">
              <thead>
                <tr>
                  <th className={TH}>Document</th>
                  <th className={TH}>File</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeDocs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-base text-slate-500"
                    >
                      No documents to upload. Please select a business type in
                      Business Info.
                    </td>
                  </tr>
                ) : (
                  activeDocs.map((key) => {
                    const doc = documents[key];
                    const uploaded = !!doc?.fileUrl;
                    const verified = doc?.status === "VERIFIED";
                    const rejected = doc?.status === "REJECTED";
                    return (
                      <tr
                        key={key}
                        className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                      >
                        <td
                          className={`${TD} font-medium text-slate-800 text-sm`}
                        >
                          {labelOf(key)}
                          {meta(key)?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </td>
                        <td className={`${TD} max-w-[240px] truncate text-sm`}>
                          {doc?.fileName || "-"}
                        </td>
                        <td className={TD}>
                          <span
                            className={`${BADGE} ${BADGE_COLORS[verified ? "green" : rejected ? "red" : uploaded ? "blue" : "yellow"]}`}
                          >
                            {verified
                              ? "VERIFIED"
                              : rejected
                                ? "REJECTED"
                                : uploaded
                                  ? "UPLOADED"
                                  : "PENDING UPLOAD"}
                          </span>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-2">
                            <label
                              className={`${ROW_BTN} text-slate-700 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              <Upload size={14} className="mr-1.5" />
                              {uploaded ? "Replace" : "Upload"}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUpload(key, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {uploaded && !verified && (
                              <>
                                <button
                                  onClick={() => setVerifyKey(key)}
                                  disabled={isVerifying}
                                  className={`${ROW_BTN} text-green-700`}
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => setRejectKey(key)}
                                  disabled={isRejecting}
                                  className={`${ROW_BTN} text-orange-700`}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeleteKey(key)}
                              disabled={isDeleting}
                              className={`${ROW_BTN} text-red-600`}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {customOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-md`}>
            <div className={MODAL_HEADER}>
              <h3 className="text-base font-semibold text-slate-900">
                Add Custom Document
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Name the document and upload the file
              </p>
            </div>
            <div className={`${MODAL_BODY} space-y-4`}>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${INPUT} h-10 text-base mt-1`}
                  placeholder="e.g. Partnership Deed"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>
                  File <span className="text-red-500">*</span>
                </label>
                <label className="mt-1 flex items-center justify-center gap-2 h-24 border border-dashed border-slate-300 rounded-md cursor-pointer text-base text-slate-600 hover:bg-[#f5efe0] transition">
                  <Upload size={18} />
                  {customFile ? customFile.name : "Click to choose a file"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCustomFile(f);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => {
                  setCustomOpen(false);
                  setCustomName("");
                  setCustomFile(null);
                }}
                className="h-10 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustom}
                disabled={isUploading}
                className={`${BTN_PRIMARY} h-10 px-5 disabled:opacity-50`}
              >
                {isUploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteKey}
        danger
        title="Remove Document?"
        message="This action cannot be undone."
        confirmLabel="Yes, Remove"
        loading={isDeleting}
        onCancel={() => setDeleteKey(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmModal
        open={!!verifyKey}
        title="Verify Document?"
        message="Once verified, the status changes to Verified."
        confirmLabel="Yes, Verify"
        loading={isVerifying}
        onCancel={() => setVerifyKey(null)}
        onConfirm={confirmVerify}
      />
      <ConfirmModal
        open={!!rejectKey}
        danger
        title="Reject Document?"
        message="The merchant will see this document as rejected and can re-upload."
        confirmLabel="Yes, Reject"
        loading={isRejecting}
        onCancel={() => setRejectKey(null)}
        onConfirm={confirmReject}
      />
    </>
  );
}
