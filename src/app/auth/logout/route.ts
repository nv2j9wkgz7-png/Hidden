import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { handler, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { error } = await (await supabase()).auth.signOut();
  if (error) throw error;
  return NextResponse.redirect(`${appUrl()}/login`, 303);
});
