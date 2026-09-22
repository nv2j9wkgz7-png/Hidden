import 'server-only';
import { admin } from '../supabase/admin';
import { appUrl, env } from '../env';
import { hashToken } from '../security';
import { emailAccessToken, purchaseEmail, sendEmail } from './message';

export function emailConfigured() {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM &&
    process.env.EMAIL_ACCESS_SECRET
  );
}

export async function sendPurchaseEmail(purchaseId: string) {
  if (!emailConfigured()) return 'disabled';
  const base = new URL(appUrl());
  if (base.protocol !== 'https:' || base.username || base.password)
    throw new Error('Purchase emails require a public HTTPS APP_URL.');
  const db = admin();
  const { data: purchase, error } = await db
    .from('purchases')
    .select('id,drop_id,status,amount_cents,customer_email,email_sent_at')
    .eq('id', purchaseId)
    .maybeSingle();
  if (error) throw error;
  if (!purchase || purchase.status !== 'PAID' || !purchase.customer_email)
    return 'skipped';
  if (purchase.email_sent_at) return 'sent';
  const { data: drop, error: dropError } = await db
    .from('drops')
    .select('title,slug')
    .eq('id', purchase.drop_id)
    .single();
  if (dropError) throw dropError;
  const token = emailAccessToken(purchase.id, env('EMAIL_ACCESS_SECRET'));
  // Persist only a hash. Keep the original checkout token valid on the buyer's browser.
  const { data: ready, error: tokenError } = await db
    .from('purchases')
    .update({ email_access_token: hashToken(token) })
    .eq('id', purchase.id)
    .eq('status', 'PAID')
    .is('email_sent_at', null)
    .select('id')
    .maybeSingle();
  if (tokenError) throw tokenError;
  if (!ready) return 'skipped';
  const url = new URL(`/d/${drop.slug}`, base);
  url.hash = `access=${token}`;
  const id = await sendEmail({
    apiKey: env('RESEND_API_KEY'),
    from: env('EMAIL_FROM'),
    to: purchase.customer_email,
    purchaseId: purchase.id,
    message: purchaseEmail({
      title: drop.title,
      amountCents: purchase.amount_cents,
      url: url.toString(),
    }),
  });
  const { error: sentError } = await db
    .from('purchases')
    .update({ email_sent_at: new Date().toISOString(), email_provider_id: id })
    .eq('id', purchase.id);
  if (sentError) throw sentError;
  return 'sent';
}
