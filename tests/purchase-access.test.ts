import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('purchase routes verify account ownership and preserve guest boundaries', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/purchase-access.ts',
    ],
    { stdio: 'pipe' },
  );
});
