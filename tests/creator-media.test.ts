import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('creator thumbnails stay private, resize originals once, and sign full media only on demand', () => {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-test-module-mocks',
      '--import',
      'tsx',
      'tests/helpers/creator-media.ts',
    ],
    { stdio: 'pipe' },
  );
});
