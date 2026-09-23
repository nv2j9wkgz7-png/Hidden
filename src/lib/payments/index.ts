import 'server-only';
import { env } from '@/lib/env';
import { StripeProvider } from './stripe';
import type { PaymentProvider } from './types';
export function paymentProvider(
  name = process.env.PAYMENT_PROVIDER || 'stripe',
  stripeAccount?: string | null,
): PaymentProvider {
  switch (name) {
    case 'stripe':
      return new StripeProvider(
        env('STRIPE_SECRET_KEY'),
        env('STRIPE_WEBHOOK_SECRET'),
        process.env.STRIPE_ENABLE_CASH_APP_PAY === 'true',
        stripeAccount || undefined,
      );
    default:
      throw new Error(`Unsupported payment provider: ${name}`);
  }
}
