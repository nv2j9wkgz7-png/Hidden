import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, sameOrigin } from '@/lib/http';
export const GET = handler(async () => {
  const user = await creator();
  const db = admin();
  const [{ data, error }, unread] = await Promise.all([
    db
      .from('sale_notifications')
      .select(
        'id,title,amount_cents,created_at,read_at,drops!inner(slug),purchases!inner(status)',
      )
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('sale_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .is('read_at', null),
  ]);
  if (error || unread.error) throw error || unread.error;
  return json({ notifications: data, unread: unread.count || 0 });
});
export const PATCH = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const { ids } = z
    .object({ ids: z.array(z.uuid()).min(1).max(30) })
    .parse(await request.json());
  const { error } = await admin()
    .from('sale_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('creator_id', user.id)
    .in('id', ids)
    .is('read_at', null);
  if (error) throw error;
  return json({ saved: true });
});
