export interface GatewayMapping {
  id: number;
  gatewayId: number;
  gatewayName?: string;
  merchantId: number;
  merchantName?: string;
  status: "ACTIVE" | "INACTIVE";
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gateway {
  id: number;
  name: string;
  isActive: boolean;
  gateway_name?: string;
  serviceType?: string;
}

export interface Merchant {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface GatewayMappingFormData {
  gatewayId: number;
  merchantId: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface GatewayMappingFilters {
  merchantId?: number;
  gatewayId?: number;
  status?: string;
}
