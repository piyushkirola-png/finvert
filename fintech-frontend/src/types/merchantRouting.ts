export interface MerchantGatewayPriority {
  id?: number;
  merchantRoutingPrefId?: number;
  gatewayId: number;
  gatewayName?: string;
  priority: number;
  paymentModes: string[];
  enableFailover: boolean;
  maxRetries: number;
  isActive: boolean;
}

export interface MerchantRouting {
  id: number;
  merchantId: number;
  merchantName?: string;
  routingStrategy: "PRIORITY" | "FAILOVER" | "LOAD_BALANCE" | "HYBRID";
  preferredGatewayId: number | null;
  preferredGatewayName?: string;
  loadBalancingConfig: Record<string, number> | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  restrictedGateways: number[];
  restrictedGatewayNames?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  priorities?: MerchantGatewayPriority[];
}

export interface MerchantRoutingFormData {
  merchantId: number;
  routingStrategy: string;
  preferredGatewayId: number | null;
  loadBalancingConfig: Record<string, number>;
  riskLevel: string;
  restrictedGateways: number[];
  isActive: boolean;
  priorities: Omit<MerchantGatewayPriority, "id" | "merchantRoutingPrefId">[];
}

export interface Merchant {
  id: number;
  name: string;
  email: string;
}

export interface Gateway {
  id: number;
  gateway_name: string;
}
