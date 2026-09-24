import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { analyticsPeriod, checkoutConversion } from '../src/lib/analytics';
test('analytics periods and conversion handle empty and abandoned checkouts', () => {
  assert.equal(analyticsPeriod('7'), 7);
  assert.equal(analyticsPeriod('90'), 90);
  assert.equal(analyticsPeriod('0'), 30);
  assert.equal(analyticsPeriod(), 30);
  assert.equal(checkoutConversion(0, 0), '—');
  assert.equal(checkoutConversion(0, 4), '0.0%');
  assert.equal(checkoutConversion(1, 4), '25.0%');
});
test('view endpoint rejects forged origins and excludes owners and bots', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/analytics.ts',
    ],
    { stdio: 'pipe' },
  );
});
