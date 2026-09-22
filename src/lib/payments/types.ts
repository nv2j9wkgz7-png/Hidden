export type CheckoutInput = {
  purchaseId: string;
  title: string;
  amountCents: number;
  currency: 'usd';
  successUrl: string;
  cancelUrl: string;
};
export type PaymentEvent = {
  eventId: string;
  purchaseId: string;
  transactionId: string;
  amountCents: number;
  currency: string;
  kind: 'paid' | 'refunded';
  customerEmail: string | null;
};
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }>;
  getCheckout(
    transactionId: string,
  ): Promise<{ url: string | null; status: 'open' | 'complete' | 'expired' }>;
  verifyWebhook(body: string, headers: Headers): Promise<PaymentEvent | null>;
  refundPayment(transactionId: string, idempotencyKey: string): Promise<void>;
}
