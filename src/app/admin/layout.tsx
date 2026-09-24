import { redirect, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import { isModerator } from '@/lib/moderation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private review' };
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login?next=admin');
  if (!(await isModerator(user.id))) notFound();
  return <section className="moderation-page">{children}</section>;
}
