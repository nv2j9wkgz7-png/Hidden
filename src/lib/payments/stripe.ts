import Stripe from 'stripe';
import type { CheckoutInput, PaymentEvent, PaymentProvider } from './types';
export class InvalidWebhook extends Error {}
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;
  constructor(
    secret: string,
    private webhookSecret: string,
    private cashApp = false,
  ) {
    this.stripe = new Stripe(secret, { maxNetworkRetries: 2 });
  }
  async createCheckout(input: CheckoutInput) {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: this.cashApp ? ['card', 'cashapp'] : ['card'],
        client_reference_id: input.purchaseId,
        metadata: { purchase_id: input.purchaseId },
        payment_intent_data: { metadata: { purchase_id: input.purchaseId } },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency,
              unit_amount: input.amountCents,
              product_data: { name: input.title },
            },
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      { idempotencyKey: `checkout:${input.purchaseId}` },
    );
    if (!session.url) throw new Error('Checkout URL missing');
    return { id: session.id, url: session.url };
  }
  async getCheckout(transactionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(transactionId);
    if (
      session.status !== 'open' &&
      session.status !== 'complete' &&
      session.status !== 'expired'
    )
      throw new Error('Unknown checkout state. Please try again later.');
    const status = session.status as 'open' | 'complete' | 'expired';
    return { url: session.url, status };
  }
  async expireCheckout(transactionId: string) {
    const session = await this.getCheckout(transactionId);
    if (session.status !== 'open') return;
    try {
      await this.stripe.checkout.sessions.expire(transactionId);
    } catch (error) {
      // A checkout may complete or another request may expire it concurrently.
      if ((await this.getCheckout(transactionId)).status === 'open')
        throw error;
    }
  }
  async verifyWebhook(
    body: string,
    headers: Headers,
  ): Promise<PaymentEvent | null> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        headers.get('stripe-signature') || '',
        this.webhookSecret,
      );
    } catch {
      throw new InvalidWebhook('Invalid webhook signature');
    }
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      if (session.mode !== 'payment' || session.payment_status !== 'paid')
        return null;
      return this.normalize(event.id, session, 'paid');
    }
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      // Partial refunds retain access. Full refunds revoke future download links.
      if (!charge.refunded || charge.amount_refunded < charge.amount)
        return null;
      const intent =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!intent) return null;
      const sessions = await this.stripe.checkout.sessions.list({
        payment_intent: intent,
        limit: 1,
      });
      const session = sessions.data[0];
      if (!session) return null;
      return this.normalize(event.id, session, 'refunded');
    }
    return null;
  }
  private normalize(
    eventId: string,
    session: Stripe.Checkout.Session,
    kind: PaymentEvent['kind'],
  ): PaymentEvent | null {
    const purchaseId = session.metadata?.purchase_id;
    if (!purchaseId) return null; // Other products on the same Stripe account.
    if (session.amount_total === null || !session.currency)
      throw new Error('Incomplete checkout event');
    return {
      eventId,
      purchaseId,
      transactionId: session.id,
      amountCents: session.amount_total,
      currency: session.currency,
      kind,
      customerEmail: session.customer_details?.email || null,
    };
  }
  async refundPayment(transactionId: string, idempotencyKey: string) {
    const session = await this.stripe.checkout.sessions.retrieve(transactionId);
    const intent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!intent) throw new Error('No payment to refund');
    await this.stripe.refunds.create(
      { payment_intent: intent },
      { idempotencyKey },
    );
    // Access changes only when the verified refund webhook is applied.
  }
}
