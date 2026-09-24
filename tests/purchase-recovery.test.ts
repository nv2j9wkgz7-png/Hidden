import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { recoveryEmail, maskRecoveryEmail } from '../src/lib/purchase-recovery';
import { purchaseRecoveryEmail } from '../src/lib/email/message';
import { loginDestination } from '../src/lib/login-destination';
test('recovery normalizes exact email addresses without alias or wildcard matching', () => {
  assert.equal(
    recoveryEmail.parse(' Buyer+Private@Example.com '),
    'buyer+private@example.com',
  );
  assert.equal(recoveryEmail.safeParse('not an email').success, false);
  assert.equal(
    recoveryEmail.safeParse('a'.repeat(250) + '@example.com').success,
    false,
  );
  assert.equal(maskRecoveryEmail('buyer@example.com'), 'b•••@example.com');
  assert.equal(
    loginDestination('/purchases/recover/claim'),
    '/purchases/recover/claim',
  );
  assert.equal(
    loginDestination('/purchases/recover/claim?next=https://evil.example'),
    '/dashboard',
  );
});
test('recovery emails explain verification without promising a purchase or sending originals', () => {
  const message = purchaseRecoveryEmail(
    'https://hidn.example/purchases/recover/verify#verify=test',
  );
  assert.match(message.text, /30 minutes/);
  assert.match(message.text, /does not extend guest access or sign you in/);
  assert.match(message.text, /do not forward/);
  assert.doesNotMatch(message.text, /#access=|Your files are unlocked/);
});
test('recovery routes require mailbox proof plus login and send only requested verification mail', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/purchase-recovery.ts',
    ],
    { stdio: 'pipe' },
  );
});
