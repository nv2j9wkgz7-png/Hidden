import { activeCreator } from '@/lib/moderation';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, rateLimit, sameOrigin } from '@/lib/http';
import { dropInput, uuid } from '@/lib/validation';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  await rateLimit(`new-drop:${user.id}`, 30);
  const { id, ...input } = dropInput
    .extend({ id: uuid.optional() })
    .parse(await request.json());
  if (id) {
    const existing = await admin()
      .from('drops')
      .select('id,slug')
      .eq('id', id)
      .eq('creator_id', user.id)
      .eq('status', 'DRAFT')
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return json(existing.data);
  }
  const { data, error } = await admin()
    .from('drops')
    .insert({ ...input, ...(id ? { id } : {}), creator_id: user.id })
    .select('id,slug')
    .single();
  if (error) throw error;
  return json(data, 201);
});

export const PATCH = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const { id, ...input } = dropInput
    .extend({ id: uuid })
    .parse(await request.json());
  const { error } = await admin().rpc('update_draft', {
    p_drop: id,
    p_creator: user.id,
    p_title: input.title,
    p_description: input.description,
    p_price: input.price_cents,
  });
  if (error) throw error;
  return json({ saved: true });
});
