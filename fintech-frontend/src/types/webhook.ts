export interface InboundWebhook {
  id: number;
  gatewayId: number | null;
  gatewayName?: string;
  merchantId: number | null;
  merchantName?: string;
  eventType: string;
  processedAt: string | null;
  requestBody?: any;
  requestHeaders?: any;
  responseBody?: any;
  responseHeaders?: any;
  status: string;
  responseStatus: number | null;
  utr: string | null;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundWebhook {
  id: number;
  merchantId: number;
  merchantName?: string;
  gatewayId: number | null;
  gatewayName?: string;
  eventType: string;
  processedAt: string | null;
  requestBody?: any;
  requestHeaders?: any;
  responseBody?: any;
  responseHeaders?: any;
  status: string;
  amount: number | null;
  responseStatus: number | null;
  utr: string | null;
  createdAt: string;
  updatedAt: string;
}
