export interface RiskBlock {
  id: number;
  type:
    | "USER_ID"
    | "MERCHANT_ID"
    | "EMAIL"
    | "PHONE_NUMBER"
    | "CARD_BIN"
    | "CARD_LAST4"
    | "VPA"
    | "IP_ADDRESS"
    | "DEVICE_ID";
  value: string;
  reason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskBlockPayload {
  type: string;
  value: string;
  reason?: string;
  isActive?: boolean;
}

export interface UpdateRiskBlockPayload {
  type?: string;
  value?: string;
  reason?: string;
  isActive?: boolean;
}

export interface RiskBlockFilters {
  type?: string;
  value?: string;
  isActive?: string;
}
