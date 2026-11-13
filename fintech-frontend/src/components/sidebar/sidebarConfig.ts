import {
  LayoutDashboard,
  BarChart3,
  Users,
  Store,
  CreditCard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  GitBranch,
  Link as LinkIcon,
  Webhook,
  Settings,
  Shield,
  FileBarChart,
  CircleDollarSign,
  Landmark,
  Receipt,
  RefreshCw,
  FileCode,
  FileText,
  UploadCloud,
  FileUp,
  FileDown,
  ClipboardCheck,
  Play,
} from "lucide-react";
import type { Role } from "../../types/auth";

export type SidebarItem = {
  label: string;
  path?: string;
  icon: React.ElementType;
  children?: { label: string; path: string; icon?: React.ElementType }[];
};

export type SidebarSection = {
  title: string;
  icon: React.ElementType;
  items: SidebarItem[];
};

const overview: SidebarSection = {
  title: "Overview",
  icon: LayoutDashboard,
  items: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
  ],
};

const payments: SidebarSection = {
  title: "Payments",
  icon: Wallet,
  items: [
    { label: "Payin Wallet", path: "/payin-wallet", icon: Landmark },
    { label: "Payin Requests", path: "/payin-requests", icon: ArrowDownCircle },
    { label: "Payout Wallet", path: "/payout-wallet", icon: CircleDollarSign },
    { label: "Payout Requests", path: "/payout-requests", icon: ArrowUpCircle },
    { label: "Refunds", path: "/refunds", icon: RefreshCw },
    { label: "Chargebacks", path: "/chargebacks", icon: Shield },
  ],
};

const apiPlayground: SidebarSection = {
  title: "API Playground",
  icon: Play,
  items: [
    { label: "Payin", path: "/api-playground/payin", icon: Play },
    { label: "Payout", path: "/api-playground/payout", icon: Play },
  ],
};

const reports: SidebarSection = {
  title: "Reports",
  icon: FileBarChart,
  items: [
    { label: "Settlement", path: "/settlement-reports", icon: Receipt },
    { label: "CSV Export", path: "/csv-export", icon: FileBarChart },
  ],
};

const bulkUploads: SidebarSection = {
  title: "Bulk Uploads",
  icon: UploadCloud,
  items: [
    { label: "Payin", path: "/payin-bulk-upload", icon: FileUp },
    { label: "Payout", path: "/payout-bulk-upload", icon: FileDown },
  ],
};

const management: SidebarSection = {
  title: "Management",
  icon: Users,
  items: [
    { label: "Users", path: "/users", icon: Users },
    { label: "Merchants", path: "/merchants", icon: Store },
    { label: "Gateways", path: "/gateways", icon: CreditCard },
  ],
};

const system: SidebarSection = {
  title: "System",
  icon: Settings,
  items: [
    { label: "Merchant Routing", path: "/merchant-routing", icon: GitBranch },
  ],
};

const apiReference: SidebarSection = {
  title: "Api Reference",
  icon: FileText,
  items: [
    {
      label: "Direct API",
      icon: FileCode,
      children: [
        {
          label: "Payin Docs",
          path: "/api-documentation/direct-api/payin",
          icon: ArrowDownCircle,
        },
        {
          label: "Payout Docs",
          path: "/api-documentation/direct-api/payout",
          icon: ArrowUpCircle,
        },
      ],
    },
  ],
};

const configuration: SidebarSection = {
  title: "Configuration",
  icon: LinkIcon,
  items: [
    {
      label: "Gateway Mappings",
      path: "/gateway-merchant-mappings",
      icon: LinkIcon,
    },
    { label: "Risk Blocks", path: "/risk-blocks", icon: Shield },
  ],
};

const monitoring: SidebarSection = {
  title: "Monitoring",
  icon: Webhook,
  items: [
    { label: "Inbound Webhooks", path: "/inbound", icon: Webhook },
    { label: "Outbound Webhooks", path: "/outbound", icon: Webhook },
  ],
};

const documentation: SidebarSection = {
  title: "Documentation",
  icon: FileText,
  items: [
    { label: "Document Status", path: "/documentation", icon: ClipboardCheck },
  ],
};

export function getSections(
  role: Role | null,
  isPremium: boolean,
): SidebarSection[] {
  if (role === "ADMIN") {
    return [
      overview,
      payments,
      management,
      bulkUploads,
      reports,
      system,
      apiReference,
      configuration,
      monitoring,
    ];
  }
  if (role === "USER") {
    return [
      overview,
      payments,
      apiPlayground,
      ...(isPremium ? [bulkUploads] : []),
      documentation,
      apiReference,
      reports,
    ];
  }
  return [];
}

export function panelTitle(role: Role | null): {
  title: string;
  subtitle: string;
} {
  if (role === "ADMIN")
    return { title: "Admin Panel", subtitle: "Payment Dashboard" };
  return { title: "Merchant Panel", subtitle: "Payment Dashboard" };
}
