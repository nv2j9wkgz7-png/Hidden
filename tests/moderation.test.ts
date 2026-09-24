import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('report and moderation routes enforce privacy, origin, role and retry boundaries', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/moderation.ts',
    ],
    { stdio: 'pipe' },
  );
});
