import { relationOne } from '@/lib/relation';
import { NavigationLink as Link } from '@/components/navigation-link';
import { admin } from '@/lib/supabase/admin';
import { moderator } from '@/lib/moderation';
import { reportCategories } from '@/lib/report-input';
export default async function Queue({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; closed?: string }>;
}) {
  await moderator(); // Pages/data are independently protected, not only the layout.
  const params = await searchParams,
    page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1))),
    closed = params.closed === '1';
  const db = admin();
  const {
    data: reports,
    error,
    count,
  } = await db
    .from('content_reports')
    .select(
      'id,category,status,priority,created_at,drops(title,moderation_state)',
      { count: 'exact' },
    )
    .in('status', closed ? ['RESOLVED', 'DISMISSED'] : ['OPEN', 'REVIEWING'])
    .order('priority')
    .order('created_at')
    .order('id')
    .range((page - 1) * 30, page * 30 - 1);
  if (error) throw error;
  const { count: pending, error: cleanupError } = await db
    .from('moderation_cleanup')
    .select('drop_id', { count: 'exact', head: true })
    .eq('pending', true);
  if (cleanupError) throw cleanupError;
  return (
    <>
      <div className="eyebrow">Private admin</div>
      <h1>Reports & review</h1>
      <p>
        Reports flag content for review. Only an admin decision changes access
        or sales.
      </p>
      {!!pending && (
        <p className="notice error">
          {pending} drop(s) need checkout or preview cleanup. Open the related
          report and retry cleanup. Access restrictions are already active.
        </p>
      )}
      <nav className="moderation-tabs">
        <Link href="/admin" aria-current={!closed ? 'page' : undefined}>
          Open & reviewing
        </Link>
        <Link href="/admin?closed=1" aria-current={closed ? 'page' : undefined}>
          Resolved & dismissed
        </Link>
      </nav>
      {!reports?.length && (
        <div className="panel">
          <h2>No reports here.</h2>
          <p>New reports will appear in this private queue.</p>
        </div>
      )}
      <div className="report-list">
        {reports?.map((r) => (
          <Link
            className="panel report-row"
            href={`/admin/reports/${r.id}`}
            key={r.id}
          >
            <div>
              <span className="badge">{r.status.toLowerCase()}</span>
              <h2>{relationOne(r.drops)?.title || 'Unavailable drop'}</h2>
              <p>
                {reportCategories[r.category as keyof typeof reportCategories]}
              </p>
            </div>
            <div className="hint">
              {new Date(r.created_at).toLocaleString('en-US', {
                timeZone: 'UTC',
              })}{' '}
              UTC
              <br />
              {relationOne(r.drops)?.moderation_state.toLowerCase()} · Review →
            </div>
          </Link>
        ))}
      </div>
      <nav className="moderation-tabs">
        {page > 1 && (
          <Link href={`/admin?page=${page - 1}&closed=${closed ? 1 : 0}`}>
            ← Previous
          </Link>
        )}
        {(count || 0) > page * 30 && (
          <Link href={`/admin?page=${page + 1}&closed=${closed ? 1 : 0}`}>
            Next →
          </Link>
        )}
      </nav>
    </>
  );
}
