import { useState } from "react";
import { PAGE_HEADER } from "../../../lib/styles";
import { PayinForm } from "./PayinForm";
import { PayinQRCode } from "./PayinQRCode";
import { PayinResponseData } from "./PayinResponseData";

export default function PayinApiPlayground() {
  const [result, setResult] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payin Playground
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Initiate a real payin request via UI
          </p>
        </div>
      </div>

      {/* Top Row: Form (Left) & QR (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PayinForm onSuccess={(data) => setResult(data)} />
        <PayinQRCode result={result} />
      </div>

      {/* Bottom Row: Data */}
      <PayinResponseData result={result} />
    </div>
  );
}
