import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { supabase } from '@/lib/supabase/server';
import { handler, json, rateLimit, requestIp, sameOrigin } from '@/lib/http';
import { hashToken } from '@/lib/security';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, session } = z
    .object({ drop_id: z.uuid(), session: z.uuid() })
    .parse(await request.json());
  // Browser execution already excludes link unfurlers; also ignore known automated agents.
  if (
    /bot|crawler|spider|headless|preview|facebookexternalhit/i.test(
      request.headers.get('user-agent') || '',
    )
  )
    return json({ received: true });
  await rateLimit(`drop-view:${requestIp(request)}`, 120);
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('creator_id')
    .eq('id', drop_id)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .neq('moderation_state', 'REMOVED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) return json({ received: true });
  const {
    data: { user },
    error: authError,
  } = await (await supabase()).auth.getUser();
  if (user?.id === drop.creator_id) return json({ received: true });
  // A failed signed-in session must not turn an owner visit into a buyer visit.
  if (authError && authError.name !== 'AuthSessionMissingError')
    return json({ received: true });
  const { error: recordError } = await db.rpc('record_drop_view', {
    p_drop: drop_id,
    p_session: hashToken(
      `${drop_id}:${new Date().toISOString().slice(0, 10)}:${session}`,
    ),
  });
  if (recordError) throw recordError;
  return json({ received: true });
});
