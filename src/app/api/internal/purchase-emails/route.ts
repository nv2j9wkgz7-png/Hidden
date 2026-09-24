import { timingSafeEqual } from 'node:crypto';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json } from '@/lib/http';
import { sendSaleEmail } from '@/lib/email/sale';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Operator-only creator notification retry. Never sends buyer access emails.
export const POST = handler(async (request) => {
  const expected = `Bearer ${process.env.EMAIL_RETRY_SECRET || ''}`;
  const supplied = request.headers.get('authorization') || '';
  if (
    !process.env.EMAIL_RETRY_SECRET ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    throw new HttpError(401, 'Unauthorized.');
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(503, 'Sale email is not configured.');
  let failed = 0;
  const pending = await admin()
    .from('sale_notifications')
    .select('id,purchases!inner(status)')
    .is('email_sent_at', null)
    .eq('purchases.status', 'PAID')
    .order('created_at')
    .limit(5);
  if (pending.error) throw pending.error;
  let saleSent = 0;
  for (const notice of pending.data) {
    try {
      if ((await sendSaleEmail(notice.id)) === 'sent') saleSent++;
    } catch {
      failed++;
    }
  }
  return json(
    { sent: 0, saleSent, failed, checked: pending.data.length },
    failed ? 502 : 200,
  );
});
