import { toast } from "sonner";
import { CARD, LABEL } from "../../../lib/styles";

const CopyField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-2 flex-1">
    <div className="flex justify-between items-center">
      <label className={LABEL}>{label}</label>
      {value && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
          className={`${LABEL} hover:text-slate-900 transition`}
        >
          Click To Copy
        </button>
      )}
    </div>
    <textarea
      readOnly
      className="w-full h-20 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md resize-none"
      value={value || ""}
    />
  </div>
);

export function PayinResponseData({ result }: { result: any }) {
  const qrImageUrl = result?.intent
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(result.intent)}`
    : "";

  return (
    <div className={`${CARD} p-6`}>
      <h2 className="text-lg font-semibold mb-4">Data</h2>
      <div className="flex flex-col md:flex-row gap-6">
        <CopyField label="QR Image URL" value={qrImageUrl} />
        <CopyField label="Upi Intent" value={result?.intent || ""} />
      </div>
    </div>
  );
}
