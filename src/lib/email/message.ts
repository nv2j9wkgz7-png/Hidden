import { createHmac } from 'node:crypto';
import { money } from '../format';

export function emailAccessToken(purchaseId: string, secret: string) {
  if (secret.length < 32)
    throw new Error('EMAIL_ACCESS_SECRET must contain at least 32 characters.');
  return createHmac('sha256', secret)
    .update(`hidden:purchase-email:v1:${purchaseId}`)
    .digest('base64url');
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}

export function purchaseEmail(input: {
  title: string;
  amountCents: number;
  url: string;
}) {
  const title = escapeHtml(input.title);
  const url = escapeHtml(input.url);
  const price = money(input.amountCents);
  return {
    subject: 'Your Hidden images are unlocked',
    text: `Your images are unlocked.\n\n${input.title}\nPaid ${price} USD\n\nView and download your originals:\n${input.url}\n\nSave this email to return anytime, on any device. No Hidden account needed.\nKeep this link private: anyone with it can access your purchase.\nIf the creator stops sales, your paid access remains. A refund revokes access.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f7fa;font-family:Arial,sans-serif;color:#20212a"><div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:20px"><p style="color:#7755c4;font-size:26px;font-weight:bold">Hidden</p><h1 style="font-size:28px">Your images are unlocked.</h1><p style="font-size:18px">${title}</p><p style="color:#686e7c">Paid ${price} USD</p><p style="margin:32px 0"><a href="${url}" style="display:inline-block;background:#6940e8;color:#fff;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:bold">View my images</a></p><p>Download your originals individually or as a ZIP. Save this email to return on any device. No Hidden account needed.</p><p style="font-size:13px;color:#686e7c">Keep this link private: anyone with it can access your purchase. If the creator stops sales, your paid access remains. A refund revokes access.</p><p style="font-size:12px;word-break:break-all">Button not working? Open this link:<br/><a href="${url}">${url}</a></p></div></body></html>`,
  };
}

export async function sendEmail(
  input: {
    apiKey: string;
    from: string;
    to: string;
    purchaseId: string;
    message: ReturnType<typeof purchaseEmail>;
  },
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `purchase-email/${input.purchaseId}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      ...input.message,
    }),
    signal: AbortSignal.timeout(10000),
  });
  // Do not log provider response bodies: they may include addresses or private links.
  if (!response.ok)
    throw new Error(`Email provider returned HTTP ${response.status}.`);
  const result = await response.json();
  if (typeof result.id !== 'string')
    throw new Error('Email provider did not return a message ID.');
  return result.id as string;
}
