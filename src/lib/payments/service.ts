import 'server-only';
import { admin } from '@/lib/supabase/admin';
import type { PaymentEvent } from './types';
import { sendPurchaseEmail } from '../email/service';
export async function paymentSucceeded(provider: string, event: PaymentEvent) {
  const { error } = await admin().rpc('apply_payment_event', {
    p_provider: provider,
    p_event_id: event.eventId,
    p_purchase: event.purchaseId,
    p_transaction: event.transactionId,
    p_amount: event.amountCents,
    p_currency: event.currency,
    p_kind: event.kind,
    p_email: event.customerEmail,
  });
  if (error) throw error;
  // Retry even for duplicate webhook events. Payment is committed before email.
  if (event.kind === 'paid') await sendPurchaseEmail(event.purchaseId);
}
