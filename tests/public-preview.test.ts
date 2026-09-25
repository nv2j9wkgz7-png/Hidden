import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('only explicitly public ready files unlock without payment; draft, moderation and consent gates hold', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/public-preview.ts',
    ],
    { stdio: 'pipe' },
  );
});
