// Run with: node --env-file=.env.local scripts/retry-purchase-emails.mjs
const { APP_URL, EMAIL_RETRY_SECRET } = process.env;
if (!APP_URL || !EMAIL_RETRY_SECRET)
  throw new Error('Set APP_URL and EMAIL_RETRY_SECRET first.');
const response = await fetch(
  new URL('/api/internal/purchase-emails', APP_URL),
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${EMAIL_RETRY_SECRET}` },
  },
);
console.log(await response.json());
if (!response.ok) process.exitCode = 1;
