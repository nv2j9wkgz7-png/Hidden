import 'server-only';
import { cache } from 'react';
import { admin } from '@/lib/supabase/admin';
import { configured } from '@/lib/env';

// Deliberately excludes original storage paths and all purchase information.
export const publicDrop = cache(async (slug: string) => {
  if (!configured() || !/^[a-f0-9]{24}$/.test(slug)) return null;
  const { data, error } = await admin()
    .from('drops')
    .select(
      'title,description,price_cents,assets(preview_path,size_bytes,sort_order,status)',
    )
    .eq('slug', slug)
    .neq('moderation_state', 'REMOVED')
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    assets: data.assets
      .filter((a) => a.status === 'READY')
      .sort((a, b) => a.sort_order - b.sort_order),
  };
});
