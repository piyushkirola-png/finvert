import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/guards/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

/* AUTH */
import Login from "./pages/auth/Login";
import Profile from "./pages/auth/Profile";
import UpdatePassword from "./pages/auth/UpdatePassword";

/* DASHBOARD */
import Dashboard from "./pages/dashboard/Dashboard";
import Analytics from "./pages/analytics/Analytics";

/* API PLAYGROUND */
import PayinApiPlayground from "./pages/api-playground/payin/PayinApiPlayground";
import PayoutApiPlayground from "./pages/api-playground/payout/PayoutApiPlayground";

/* GATEWAYS */
import Gateways from "./pages/gateway/index";

/* USERS */
import UsersList from "./pages/users/index";
import MerchantRegistration from "./pages/merchants/MerchantRegistration";
import MerchantOnboarding from "./pages/merchant-onboarding";
import MerchantsListPage from "./pages/merchants";
import MerchantSummary from "./pages/merchants/MerchantSummary";
import WebhookFormat from "./pages/merchants/WebhookFormat";

/* PAYMENTS */
import PayInRequests from "./pages/payin-requests/PayinRequests";
import PayinWalletStatement from "./pages/payin-wallet/PayinWalletStatement";
import PayoutRequests from "./pages/payout-requests/PayoutRequests";
import PayoutWalletStatement from "./pages/payout-wallet/PayoutWalletStatement";
import Refunds from "./pages/refunds/Refunds";
import Chargebacks from "./pages/chargeback/Chargebacks";

/* DOCUMENTATION */
import Documentation from "./pages/documentation/Documentation";

/* BULK UPLOAD */
import PayinBulkUpload from "./pages/payin-bulk-upload";
import PayoutBulkUpload from "./pages/payout-bulk-upload";

/* MERCHANT ROUTING */
import MerchantRoutingPage from "./pages/merchant-routing";

/* API DOCUMENTATION */
import DirectApiOverview from "./pages/api-documentation/direct-api";
import DirectApiPayin from "./pages/api-documentation/direct-api/payin";
import DirectApiPayout from "./pages/api-documentation/direct-api/payout";

/* REPORTS */
import Settlement from "./pages/settlement/Settlement";
import CSVExport from "./pages/csv-export/CSVExport";

/* GATEWAY MAPPINGS */
import GatewayMappings from "./pages/gateway-merchant-mappings";

/* RISK BLOCKS */
import RiskBlocks from "./pages/risk-blocks";

/* WEBHOOKS */
import InboundWebhooks from "./pages/webhooks/InboundWebhooks";
import OutboundWebhooks from "./pages/webhooks/OutboundWebhooks";

/* LEGAL */
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";

export default function App() {
  return (
    <Routes>
      {/* ROOT */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/merchant-registration" element={<MerchantRegistration />} />

      {/* LEGAL */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />

      {/* PROTECTED AREA */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* OVERVIEW */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* API PLAYGROUND */}
          <Route
            path="/api-playground/payin"
            element={<PayinApiPlayground />}
          />
          <Route
            path="/api-playground/payout"
            element={<PayoutApiPlayground />}
          />

          {/* GATEWAYS */}
          <Route path="/gateways" element={<Gateways />} />

          {/* USERS */}
          <Route path="/users" element={<UsersList />} />
          <Route path="/merchants" element={<MerchantsListPage />} />
          <Route path="/merchant-onboarding" element={<MerchantOnboarding />} />
          <Route
            path="/merchant-onboarding/:id"
            element={<MerchantOnboarding />}
          />
          <Route path="/merchant-summary/:id" element={<MerchantSummary />} />
          <Route path="/webhook-format/:id" element={<WebhookFormat />} />

          {/* PAYMENTS */}
          <Route path="/payin-wallet" element={<PayinWalletStatement />} />
          <Route path="/payin-requests" element={<PayInRequests />} />
          <Route path="/payout-wallet" element={<PayoutWalletStatement />} />
          <Route path="/payout-requests" element={<PayoutRequests />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/chargebacks" element={<Chargebacks />} />

          {/* BULK UPLOAD */}
          <Route path="/payin-bulk-upload" element={<PayinBulkUpload />} />
          <Route path="/payout-bulk-upload" element={<PayoutBulkUpload />} />

          {/* REPORTS */}
          <Route path="/settlement-reports" element={<Settlement />} />
          <Route path="/csv-export" element={<CSVExport />} />

          {/* API DOCUMENTATION */}
          <Route
            path="/api-documentation/direct-api"
            element={<DirectApiOverview />}
          />
          <Route
            path="/api-documentation/direct-api/payin"
            element={<DirectApiPayin />}
          />
          <Route
            path="/api-documentation/direct-api/payout"
            element={<DirectApiPayout />}
          />

          {/* DOCUMENTATION */}
          <Route path="/documentation" element={<Documentation />} />

          {/* GATEWAY MAPPINGS */}
          <Route
            path="/gateway-merchant-mappings"
            element={<GatewayMappings />}
          />

          {/* MERCHANT ROUTING */}
          <Route path="/merchant-routing" element={<MerchantRoutingPage />} />

          {/* RISK BLOCKS */}
          <Route path="/risk-blocks" element={<RiskBlocks />} />

          {/* WEBHOOKS */}
          <Route path="/inbound" element={<InboundWebhooks />} />
          <Route path="/outbound" element={<OutboundWebhooks />} />

          {/* ACCOUNT */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/update-password" element={<UpdatePassword />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
