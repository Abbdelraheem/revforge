export interface CheckoutInput {
  orderId: string;
  amountCents: number;
  currency: "USD";
  description: string;
  customerEmail: string;
  successUrl: string;
}

export interface CheckoutResult {
  providerTxnId: string;
  checkoutUrl: string;
}

export interface ParsedWebhook {
  id: string; // event id
  type: string; // e.g. transaction.completed
  orderId: string;
  providerTxnId: string;
  subtotalCents: number;
  currency: string;
  raw: string;
}

export interface PaymentProvider {
  name: "paddle" | "fake";
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyAndParseWebhook(rawBody: string, headers: Headers): ParsedWebhook;
  refund?(providerTxnId: string, amountCents: number): Promise<void>;
}
