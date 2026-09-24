import { relationOne } from '@/lib/relation';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { moderator, cleanupModeration } from '@/lib/moderation';
import { handler, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
export const maxDuration = 60;
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await moderator();
  await rateLimit(`moderate:${user.id}`, 120);
  const input = z
    .object({
      report_id: z.uuid(),
      request_id: z.uuid(),
      action: z.enum([
        'REVIEW',
        'RESOLVE',
        'DISMISS',
        'PAUSE',
        'REMOVE',
        'RESUME',
        'SUSPEND',
        'UNSUSPEND',
        'RETRY_CLEANUP',
      ]),
      note: z.string().trim().min(5).max(1000),
    })
    .parse(await request.json());
  const db = admin();
  const { data: report, error } = await db
    .from('content_reports')
    .select('drop_id,drops!inner(creator_id)')
    .eq('id', input.report_id)
    .single();
  if (error || !report) throw new HttpError(404, 'Report unavailable.');
  {
    const { error } = await db.rpc('moderate_report', {
      p_actor: user.id,
      p_report: input.report_id,
      p_action: input.action,
      p_note: input.note,
      p_request: input.request_id,
    });
    if (error) {
      if (error.code === 'P0001') throw new HttpError(409, error.message);
      throw error;
    }
  }
  try {
    const finished = await cleanupModeration(
      relationOne(report.drops)!.creator_id,
    );
    return json({ saved: true, cleanup_pending: !finished });
  } catch {
    return json({ saved: true, cleanup_pending: true });
  }
});
