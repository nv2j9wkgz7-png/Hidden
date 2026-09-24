import { relationOne } from './relation';
import 'server-only';
import { admin } from './supabase/admin';
import { creator, HttpError } from './http';
import { paymentProvider } from './payments';
export async function isModerator(userId: string) {
  const { data, error } = await admin()
    .from('moderation_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
export async function moderator() {
  const user = await creator();
  if (!(await isModerator(user.id)))
    throw new HttpError(403, 'Admin access required.');
  return user;
}
export async function activeCreator() {
  const user = await creator();
  const { data, error } = await admin()
    .from('users')
    .select('creator_suspended')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  if (data.creator_suspended)
    throw new HttpError(
      403,
      'Creating and selling drops is suspended on this account. Contact team@sendhidn.com for review.',
    );
  return user;
}
export async function dropModeration(dropId: string) {
  const { data, error } = await admin()
    .from('drops')
    .select(
      'moderation_state,creator_id,status,users!drops_creator_id_fkey(creator_suspended)',
    )
    .eq('id', dropId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        ...data,
        users: relationOne<{ creator_suspended: boolean }>(data.users),
      }
    : null;
}
export async function assertSalesAllowed(dropId: string) {
  const d = await dropModeration(dropId);
  if (
    !d ||
    d.status !== 'PUBLISHED' ||
    d.moderation_state !== 'ACTIVE' ||
    d.users?.creator_suspended
  )
    throw new HttpError(410, 'This drop is not accepting purchases.');
}
export async function cleanupModeration(creatorId: string) {
  const db = admin();
  const { data: jobs, error } = await db
    .from('moderation_cleanup')
    .select('drop_id,updated_at,drops!inner(creator_id,moderation_state)')
    .eq('pending', true)
    .eq('drops.creator_id', creatorId)
    .limit(100);
  if (error) throw error;
  for (const job of jobs || []) {
    let cursor: string | undefined;
    for (;;) {
      let query = db
        .from('purchases')
        .select(
          'id,payment_provider,payment_provider_transaction_id,stripe_account_id',
        )
        .eq('drop_id', job.drop_id)
        .eq('status', 'PENDING')
        .not('payment_provider_transaction_id', 'is', null)
        .order('id')
        .limit(100);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query;
      if (error) throw error;
      await Promise.all(
        (data || []).map((p) =>
          paymentProvider(
            p.payment_provider,
            p.stripe_account_id,
          ).expireCheckout(p.payment_provider_transaction_id),
        ),
      );
      if (!data || data.length < 100) break;
      cursor = data[data.length - 1].id;
    }
    if (relationOne(job.drops)?.moderation_state === 'REMOVED') {
      const { data: assets, error } = await db
        .from('assets')
        .select('preview_path')
        .eq('drop_id', job.drop_id);
      if (error) throw error;
      const paths = (assets || [])
        .map((a) => a.preview_path)
        .filter((p): p is string => !!p);
      if (paths.length) {
        const { error } = await db.storage.from('previews').remove(paths);
        if (error) throw error;
      }
    }
    const { error: done } = await db
      .from('moderation_cleanup')
      .update({ pending: false })
      .eq('drop_id', job.drop_id)
      .eq('updated_at', job.updated_at);
    if (done) throw done;
  }
  const { count, error: pendingError } = await db
    .from('moderation_cleanup')
    .select('drop_id,drops!inner(creator_id)', { count: 'exact', head: true })
    .eq('pending', true)
    .eq('drops.creator_id', creatorId);
  if (pendingError) throw pendingError;
  return count === 0;
}
