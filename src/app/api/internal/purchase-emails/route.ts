import { timingSafeEqual } from 'node:crypto';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json } from '@/lib/http';
import { emailConfigured, sendPurchaseEmail } from '@/lib/email/service';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Operator-only backfill/retry. No caller-supplied recipient or access token.
export const POST = handler(async (request) => {
  const expected = `Bearer ${process.env.EMAIL_RETRY_SECRET || ''}`;
  const supplied = request.headers.get('authorization') || '';
  if (
    !process.env.EMAIL_RETRY_SECRET ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    throw new HttpError(401, 'Unauthorized.');
  if (!emailConfigured())
    throw new HttpError(503, 'Purchase email is not configured.');
  const { data, error } = await admin()
    .from('purchases')
    .select('id')
    .eq('status', 'PAID')
    .is('email_sent_at', null)
    .not('customer_email', 'is', null)
    .order('created_at')
    .limit(5);
  if (error) throw error;
  let sent = 0,
    failed = 0;
  for (const purchase of data) {
    try {
      if ((await sendPurchaseEmail(purchase.id)) === 'sent') sent++;
    } catch {
      failed++;
    }
  }
  return json({ sent, failed, checked: data.length }, failed ? 502 : 200);
});
