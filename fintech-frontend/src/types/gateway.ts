export interface Gateway {
  id: number;
  gateway_name: string;
  service_type: "payin" | "payout" | "both";
  website_url?: string;
  logo_url?: string;
  contact_name?: string;
  contact_number?: string;
  email?: string;
  is_active: boolean;
}

export interface CreateGatewayPayload {
  name: string;
  serviceType: "payin" | "payout" | "both";
  websiteUrl?: string;
  logoUrl?: string;
  contactName: string;
  contactPhone?: string;
  contactEmail: string;
  isActive?: boolean;
}

export interface UpdateGatewayPayload {
  gateway_name?: string;
  service_type?: "payin" | "payout" | "both";
  website_url?: string;
  logo_url?: string;
  contact_name?: string;
  contact_number?: string;
  email?: string;
  is_active?: boolean;
}
