import 'server-only';
import { admin } from '../supabase/admin';
import { appUrl, env } from '../env';
import { saleEmail, sendEmail } from './message';

export async function sendSaleEmail(purchaseId: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return 'disabled';
  const url = new URL('/dashboard/payouts', appUrl());
  if (url.protocol !== 'https:') return 'disabled';
  const db = admin();
  const { data: notice, error } = await db
    .from('sale_notifications')
    .select(
      'id,creator_id,title,amount_cents,email_sent_at,purchases!inner(status)',
    )
    .eq('id', purchaseId)
    .maybeSingle();
  if (error) throw error;
  if (
    !notice ||
    (notice.purchases as unknown as { status: string }).status !== 'PAID'
  )
    return 'skipped';
  if (notice.email_sent_at) return 'sent';
  const { data, error: userError } = await db.auth.admin.getUserById(
    notice.creator_id,
  );
  if (userError) throw userError;
  if (!data.user?.email) return 'skipped';
  const providerId = await sendEmail({
    apiKey: env('RESEND_API_KEY'),
    from: env('EMAIL_FROM'),
    to: data.user.email,
    idempotencyKey: `creator-sale/${notice.id}`,
    message: saleEmail({
      title: notice.title,
      amountCents: notice.amount_cents,
      url: url.toString(),
    }),
  });
  const { error: savedError } = await db
    .from('sale_notifications')
    .update({
      email_sent_at: new Date().toISOString(),
      email_provider_id: providerId,
    })
    .eq('id', notice.id);
  if (savedError) throw savedError;
  return 'sent';
}
