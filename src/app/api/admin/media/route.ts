import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { moderator } from '@/lib/moderation';
import { handler, HttpError, rateLimit } from '@/lib/http';
export const GET = handler(async (request) => {
  const user = await moderator();
  await rateLimit(`admin-media:${user.id}`, 300);
  const { drop_id, asset_id } = z
    .object({ drop_id: z.uuid(), asset_id: z.uuid() })
    .parse(Object.fromEntries(new URL(request.url).searchParams));
  const { data, error } = await admin()
    .from('assets')
    .select('storage_path')
    .eq('id', asset_id)
    .eq('drop_id', drop_id)
    .eq('status', 'READY')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'File unavailable.');
  const { data: signed, error: signError } = await admin()
    .storage.from('originals')
    .createSignedUrl(data.storage_path, 60);
  if (signError) throw signError;
  return new Response(null, {
    status: 307,
    headers: {
      Location: signed.signedUrl,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
