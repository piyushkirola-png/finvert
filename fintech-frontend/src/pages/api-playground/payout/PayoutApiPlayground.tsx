import { PAGE_HEADER } from "../../../lib/styles";
import { PayoutForm } from "./PayoutForm";

export default function PayoutApiPlayground() {
  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payout Playground
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Initiate a real payout request via UI
          </p>
        </div>
      </div>
      <PayoutForm />
    </div>
  );
}
