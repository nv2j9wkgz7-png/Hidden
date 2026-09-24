import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabase } from './supabase/server';
import { admin } from './supabase/admin';
import { appUrl } from './env';
import { hashToken } from './security';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
export function handler(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          { error: error.issues[0]?.message || 'Invalid request.' },
          400,
        );
      console.error(
        'Request failed:',
        error instanceof Error ? error.message : 'Database or provider error',
      );
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(appUrl()).origin)
    throw new HttpError(403, 'Request origin is not allowed.');
}
export async function creator() {
  const client = await supabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Please log in.');
  return user;
}
export async function ownedDrop(id: string, userId: string) {
  const { data, error } = await admin()
    .from('drops')
    .select('*')
    .eq('id', id)
    .eq('creator_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Drop not found.');
  if (data.moderation_state !== 'ACTIVE')
    throw new HttpError(409, 'This drop is restricted while under review.');
  return data;
}
export async function rateLimit(key: string, limit: number, seconds = 3600) {
  const { data, error } = await admin().rpc('consume_rate_limit', {
    p_key: hashToken(key),
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw error;
  if (!data)
    throw new HttpError(429, 'Too many attempts. Please try again later.');
}
export function requestIp(request: Request) {
  return (
    request.headers.get(
      process.env.VERCEL ? 'x-vercel-forwarded-for' : 'x-forwarded-for',
    ) || 'local'
  )
    .split(',')[0]
    .trim();
}
