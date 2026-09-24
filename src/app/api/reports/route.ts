import { admin } from '@/lib/supabase/admin';
import {
  handler,
  HttpError,
  json,
  rateLimit,
  requestIp,
  sameOrigin,
} from '@/lib/http';
import { reportInput } from '@/lib/report-input';
import { hashToken } from '@/lib/security';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const ip = requestIp(request);
  await rateLimit(`content-report:${ip}`, 5);
  const input = reportInput.parse(await request.json());
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id')
    .eq('id', input.drop_id)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!drop) throw new HttpError(404, 'Drop unavailable.');
  const { error: insertError } = await db
    .from('content_reports')
    .insert({
      ...input,
      contact_email: input.contact_email || null,
      reporter_key: hashToken(
        `${ip}:${input.drop_id}:${new Date().toISOString().slice(0, 10)}`,
      ),
      priority:
        input.category === 'UNDERAGE'
          ? 0
          : input.category === 'NONCONSENSUAL'
            ? 1
            : 2,
    });
  if (insertError && insertError.code !== '23505') throw insertError;
  return json({ received: true });
});
