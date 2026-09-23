import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  if (code) {
    const { error } = await (
      await supabase()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        `${appUrl()}${params.get('next') === 'new' ? '/new' : '/dashboard'}`,
      );
  }
  return NextResponse.redirect(`${appUrl()}/login?error=confirmation`);
}
