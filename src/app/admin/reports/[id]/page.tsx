import { relationOne } from '@/lib/relation';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { NavigationLink as Link } from '@/components/navigation-link';
import { admin } from '@/lib/supabase/admin';
import { moderator } from '@/lib/moderation';
import { reportCategories } from '@/lib/report-input';
import {
  ModerationControls,
  ReviewMedia,
} from '@/components/moderation-controls';
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await moderator();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = admin();
  const { data: r, error } = await db
    .from('content_reports')
    .select(
      'id,drop_id,category,details,contact_email,status,created_at,drops!inner(id,title,slug,creator_id,moderation_state,users!drops_creator_id_fkey(creator_suspended))',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!r) notFound();
  const drop = relationOne(r.drops);
  if (!drop) notFound();
  const [
    { data: assets, error: assetError },
    { data: audit, error: auditError },
    { count: cleanup, error: cleanupError },
  ] = await Promise.all([
    db
      .from('assets')
      .select('id,original_filename,mime_type,size_bytes')
      .eq('drop_id', r.drop_id)
      .eq('status', 'READY')
      .order('sort_order'),
    db
      .from('moderation_audit')
      .select('id,action,note,created_at')
      .eq('report_id', id)
      .order('created_at', { ascending: false }),
    db
      .from('moderation_cleanup')
      .select('drop_id,drops!inner(creator_id)', { count: 'exact', head: true })
      .eq('pending', true)
      .eq('drops.creator_id', drop.creator_id),
  ]);
  if (assetError || auditError || cleanupError)
    throw assetError || auditError || cleanupError;
  return (
    <>
      <Link restoreScroll className="back" href="/admin">
        ← Reports
      </Link>
      <div className="eyebrow">Private report · {r.status.toLowerCase()}</div>
      <h1>{drop.title}</h1>
      <section className="panel">
        <h2>{reportCategories[r.category as keyof typeof reportCategories]}</h2>
        <p className="report-text">{r.details}</p>
        <p className="hint">
          Submitted{' '}
          {new Date(r.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}{' '}
          UTC
        </p>
        {r.contact_email && (
          <p>Contact email (unverified): {r.contact_email}</p>
        )}
      </section>
      <ReviewMedia dropId={r.drop_id} assets={assets || []} />
      <ModerationControls
        reportId={id}
        state={drop.moderation_state}
        suspended={!!relationOne(drop.users)?.creator_suspended}
        cleanupPending={!!cleanup}
      />
      <section className="panel">
        <h2>Review history</h2>
        {!audit?.length && <p>No decisions yet.</p>}
        {audit?.map((a) => (
          <article className="review-event" key={a.id}>
            <strong>{a.action.toLowerCase().replaceAll('_', ' ')}</strong>
            <p className="report-text">{a.note}</p>
            <small>
              {new Date(a.created_at).toLocaleString('en-US', {
                timeZone: 'UTC',
              })}{' '}
              UTC
            </small>
          </article>
        ))}
      </section>
    </>
  );
}
