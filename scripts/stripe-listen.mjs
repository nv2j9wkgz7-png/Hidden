// Run with: node --env-file=.env.local scripts/stripe-listen.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || '')) {
  throw new Error('This local listener requires a Stripe sandbox/test secret key.');
}
const child = spawn('npm', ['exec', '--yes', '--package=@stripe/cli', '--',
  'stripe', 'listen', '--events',
  'checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded',
  '--forward-to', 'http://127.0.0.1:3000/api/webhooks/stripe'], {
  env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let buffer = '';
function output(chunk) {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0];
    if (secret) {
      const env = readFileSync('.env.local', 'utf8');
      const existing = env.match(/^STRIPE_WEBHOOK_SECRET=(.*)$/m)?.[1];
      if (existing !== secret) {
        writeFileSync('.env.local', env.replace(/^STRIPE_WEBHOOK_SECRET=.*\n?/m, '').trimEnd()
          + '\nSTRIPE_WEBHOOK_SECRET=' + secret + '\n', { mode: 0o600 });
        console.log('Webhook signing secret saved to .env.local. Restart the app to load it.');
      } else console.log('Webhook listener ready; configured signing secret matches.');
    } else console.log(line.replace(/(?:sk|rk)_(?:test|live)_\S+/g, '[redacted]'));
  }
}
child.stdout.on('data', output);
child.stderr.on('data', output);
child.on('error', () => { console.error('Could not start Stripe CLI.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
