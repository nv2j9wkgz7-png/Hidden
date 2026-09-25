import 'server-only';
import { cache } from 'react';
import { admin } from '@/lib/supabase/admin';
import { relationOne } from './relation';
import { configured } from '@/lib/env';

// Deliberately excludes original storage paths and all purchase information.
export const publicDrop = cache(async (slug: string) => {
  if (!configured() || !/^[a-f0-9]{24}$/.test(slug)) return null;
  const { data, error } = await admin()
    .from('drops')
    .select(
      'title,description,price_cents,status,moderation_state,users!drops_creator_id_fkey(creator_suspended),assets(preview_path,size_bytes,sort_order,status,is_public_preview)',
    )
    .eq('slug', slug)
    .neq('moderation_state', 'REMOVED')
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    freePreviewCount:
      data.status === 'PUBLISHED' &&
      data.moderation_state === 'ACTIVE' &&
      !relationOne<{ creator_suspended: boolean }>(data.users)
        ?.creator_suspended
        ? data.assets.filter((a) => a.status === 'READY' && a.is_public_preview)
            .length
        : 0,
    assets: data.assets
      .filter((a) => a.status === 'READY')
      .sort((a, b) => a.sort_order - b.sort_order),
  };
});
