import 'server-only';
import { admin } from '../supabase/admin';
import { appUrl, env } from '../env';
import { sendEmail, welcomeEmail } from './message';

// Uses only the authenticated identity from Supabase getUser(), never form input.
export async function sendWelcomeEmail(userId: string, email: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
  const url = new URL('/dashboard', appUrl());
  if (url.protocol !== 'https:') return;
  const db = admin();
  const { data: user, error } = await db
    .from('users')
    .select('welcome_email_pending')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!user.welcome_email_pending) return;
  await sendEmail({
    apiKey: env('RESEND_API_KEY'),
    from: env('EMAIL_FROM'),
    to: email,
    idempotencyKey: `welcome-email/${userId}`,
    message: welcomeEmail(url.toString()),
  });
  const { error: updateError } = await db
    .from('users')
    .update({
      welcome_email_pending: false,
      welcome_email_sent_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (updateError) throw updateError;
}
