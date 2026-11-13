import { CARD } from "../../../lib/styles";
import { QRCodeSVG } from "qrcode.react";

export function PayinQRCode({ result }: { result: any }) {
  return (
    <div
      className={`${CARD} p-6 h-full flex flex-col items-center justify-center`}
    >
      <h2 className="text-lg font-semibold mb-6 self-start w-full">
        Scan to Pay
      </h2>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-[300px] h-[300px] bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-6">
          {result?.intent ? (
            <QRCodeSVG value={result.intent} size={270} />
          ) : (
            <span className="text-slate-400">QR will appear here</span>
          )}
        </div>

        <p className="text-2xl font-bold text-slate-800">
          ₹{result?.amount || "0.00"}
        </p>
      </div>
    </div>
  );
}
