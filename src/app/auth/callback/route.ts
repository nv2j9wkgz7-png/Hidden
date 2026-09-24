import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { authCallbackDestination } from '@/lib/password-recovery';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  if (code) {
    const { data, error } = await (
      await supabase()
    ).auth.exchangeCodeForSession(
      code,
      params.get('sb_flow_id')
        ? { flowId: params.get('sb_flow_id')! }
        : undefined,
    );
    return NextResponse.redirect(
      `${appUrl()}${authCallbackDestination({
        failed: !!error || !data.session,
        redirectType:
          'redirectType' in data && typeof data.redirectType === 'string'
            ? data.redirectType
            : null,
        next: params.get('next'),
      })}`,
    );
  }
  return NextResponse.redirect(`${appUrl()}/login?error=confirmation`);
}
