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

export function purchaseCodeEmail(code: string) {
  return {
    subject: 'Your Hidn verification code',
    text: `Your Hidn verification code is ${code}.\n\nEnter it in the browser where you requested it to open your purchase or save it to your account. It expires in 10 minutes and works once.\n\nDo not share this code. Hidn support will never ask for it. If you did not request this code, ignore this email.`,
    html: `<html><body style="font-family:Arial,sans-serif;background:#08070a;color:#f5f0fa;padding:32px"><h1>Hidn</h1><h2>Verify your purchase</h2><p>Enter this code in the browser where you requested it:</p><p style="font-size:32px;letter-spacing:6px">${escapeHtml(code)}</p><p>It expires in 10 minutes and works once. Use it to open your purchase or save it to your account.</p><p>Do not share this code. Hidn support will never ask for it. If you did not request it, ignore this email.</p></body></html>`,
  };
}

export function purchaseRecoveryEmail(url: string) {
  return {
    subject: 'Verify your email to recover Hidn purchases',
    text: `You requested purchase recovery on Hidn.\n\nVerify this checkout email, then log in or create an account to save eligible purchases in My purchases:\n${url}\n\nThis verification link expires in 30 minutes. It does not extend guest access or sign you in. Purchases already saved to another account and refunded purchases cannot be claimed.\n\nOnly continue if you requested this. Keep the link private and do not forward it. If you didn’t request it, ignore this email.`,
    html: `<html><body style="font-family:Arial,sans-serif;background:#08070a;color:#f5f0fa;padding:32px"><h1>Hidn</h1><h2>Recover your purchases</h2><p>You requested purchase recovery. Verify this checkout email, then log in or create an account to save eligible purchases in My purchases.</p><p><a style="color:#c399f4" href="${escapeHtml(url)}">Verify checkout email</a></p><p>This link expires in 30 minutes. It does not extend guest access or sign you in. Purchases already saved to another account and refunded purchases cannot be claimed.</p><p>Only continue if you requested this. Keep the link private and do not forward it. If you didn’t request it, ignore this email.</p></body></html>`,
  };
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
    subject: 'Your Hidn images are unlocked',
    text: `Your files are unlocked.\n\n${input.title}\nPaid ${price} USD\n\nView and download your originals:\n${input.url}\n\nSave this email to return during your 72-hour guest access window. Verify your checkout email when opening it in a new browser. No Hidn account needed.\nA new browser requires a code sent to your checkout email. Never share verification codes.\nIf the creator stops sales, your paid access remains. A refund revokes access.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f7fa;font-family:Arial,sans-serif;color:#20212a"><div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:20px"><p style="color:#7755c4;font-size:26px;font-weight:bold">Hidn</p><h1 style="font-size:28px">Your files are unlocked.</h1><p style="font-size:18px">${title}</p><p style="color:#686e7c">Paid ${price} USD</p><p style="margin:32px 0"><a href="${url}" style="display:inline-block;background:#6940e8;color:#fff;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:bold">View my files</a></p><p>Download your originals individually or as a ZIP. Save this email to return during your 72-hour guest access window. No Hidn account needed.</p><p style="font-size:13px;color:#686e7c">A new browser requires a code sent to your checkout email. Never share verification codes. If the creator stops sales, your paid access remains. A refund revokes access.</p><p style="font-size:12px;word-break:break-all">Button not working? Open this link:<br/><a href="${url}">${url}</a></p></div></body></html>`,
  };
}

export function welcomeEmail(dashboardUrl: string) {
  const url = escapeHtml(dashboardUrl);
  return {
    subject: 'Welcome to Hidn — your account is ready',
    text: `Welcome to Hidn! Your account has been created.\n\nUpload your images, set a price, and share your link.\n\nOpen your dashboard: ${dashboardUrl}\n\nNo email confirmation is needed to get started. If you did not create this account, you can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f7fa;font-family:Arial,sans-serif;color:#20212a"><div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:20px"><p style="color:#7755c4;font-size:26px;font-weight:bold">Hidn</p><h1>Your account is ready.</h1><p>Welcome to Hidn. Upload your images, set a price, and share your link.</p><p style="margin:32px 0"><a href="${url}" style="display:inline-block;background:#6940e8;color:#fff;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:bold">Open my dashboard</a></p><p>No email confirmation is needed to get started.</p><p style="font-size:13px;color:#686e7c">If you did not create this account, you can ignore this email.</p></div></body></html>`,
  };
}

export async function sendEmail(
  input: {
    apiKey: string;
    from: string;
    to: string;
    purchaseId?: string;
    idempotencyKey?: string;
    message: ReturnType<typeof purchaseEmail>;
    attachments?: { filename: string; content: string }[];
  },
  fetcher: typeof fetch = fetch,
) {
  if (!input.idempotencyKey && !input.purchaseId)
    throw new Error('Email idempotency key is required.');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key':
        input.idempotencyKey || `purchase-email/${input.purchaseId}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      ...input.message,
      ...(input.attachments ? { attachments: input.attachments } : {}),
    }),
    signal: AbortSignal.timeout(input.attachments?.length ? 30000 : 10000),
  });
  // Do not log provider response bodies: they may include addresses or private links.
  if (!response.ok)
    throw new Error(`Email provider returned HTTP ${response.status}.`);
  const result = await response.json();
  if (typeof result.id !== 'string')
    throw new Error('Email provider did not return a message ID.');
  return result.id as string;
}

export function requestedPurchaseEmail(input: {
  title: string;
  url: string;
  expiresAt: string | null;
  attached: boolean;
  accountAccess?: boolean;
}) {
  if (input.accountAccess) {
    const intro = input.attached
      ? 'Your ZIP is attached. Save it to keep your original files.'
      : 'Your collection is too large to attach. Log in to My purchases, open your collection, and select Download all to save your ZIP.';
    const note =
      'Your saved purchase is available in your private library while the files remain available. This link requires the account that saved the purchase. Attachments are yours to keep; keep this email private.';
    return {
      subject: input.attached
        ? 'Your requested Hidn ZIP'
        : 'Your requested Hidn ZIP download link',
      text: `${input.title}\n\n${intro}\n\nMy purchases:\n${input.url}\n\n${note}\n\nYou received this email because you requested it.`,
      html: `<html><body style="font-family:Arial,sans-serif;background:#08070a;color:#f5f0fa;padding:32px"><h1>Hidn</h1><h2>${escapeHtml(input.title)}</h2><p>${intro}</p><p><a style="color:#c399f4" href="${escapeHtml(input.url)}">Log in to My purchases</a></p><p>${note}</p><small>You received this email because you requested it.</small></body></html>`,
    };
  }
  const deadline = new Date(input.expiresAt!).toUTCString();
  const intro = input.attached
    ? 'Your ZIP is attached. Save it to keep your original files.'
    : 'Your collection is too large to attach. Open the private link below and select Download all to save your ZIP.';
  return {
    subject: input.attached
      ? 'Your requested Hidn ZIP'
      : 'Your requested Hidn ZIP download link',
    text: `${input.title}\n\n${intro}\n\nView files and download ZIP:\n${input.url}\n\nOnline access expires ${deadline}, 72 hours after payment. Emailing or reopening the link does not extend access. Downloaded files and attachments are yours to keep.\n\nOpening this link in a new browser requires a code sent to your checkout email. Keep codes and ZIP attachments private. No Hidn account needed. You received this email because it was requested from your paid drop.`,
    html: `<html><body style="font-family:Arial,sans-serif;background:#08070a;color:#f5f0fa;padding:32px"><h1>Hidn</h1><h2>${escapeHtml(input.title)}</h2><p>${intro}</p><p><a style="color:#c399f4" href="${escapeHtml(input.url)}">View files &amp; download ZIP</a></p><p>Online access expires <strong>${deadline}</strong>, 72 hours after payment. Emailing or reopening this link does not extend access. Save your files before then.</p><p>Downloaded files and attachments are yours to keep.</p><p>Opening this link in a new browser requires a code sent to your checkout email. Keep codes and ZIP attachments private. No Hidn account needed.</p><small>You received this email because it was requested from your paid drop.</small></body></html>`,
  };
}

export function saleEmail(input: {
  title: string;
  amountCents: number;
  url: string;
}) {
  const title = escapeHtml(input.title),
    url = escapeHtml(input.url);
  const amount = money(input.amountCents);
  return {
    subject: 'Your drop sold · Hidn',
    text: `Your drop sold!\n\n${input.title}\nSale total: ${amount} USD (before fees).\n\nView your earnings: ${input.url}\n\nA confirmed sale is not necessarily available for payout yet. Processing fees, refunds, and payout availability are shown in your account.`,
    html: `<!doctype html><html><body style="margin:0;background:#faf7fc;font-family:Arial,sans-serif;color:#292332"><div style="max-width:520px;margin:32px auto;padding:32px;background:white;border-radius:20px"><p style="color:#7755c4;font-size:26px;font-weight:bold">Hidn</p><h1>Your drop sold.</h1><p>${title}</p><p>Sale total: <strong>${amount} USD</strong> (before fees)</p><p><a href="${url}" style="display:inline-block;background:#7848a7;color:white;padding:16px 24px;border-radius:12px;text-decoration:none">View earnings</a></p><p style="font-size:13px;color:#746c7e">A confirmed sale is not necessarily available for payout yet. Check your account for fees, refunds, and payout availability.</p></div></body></html>`,
  };
}
