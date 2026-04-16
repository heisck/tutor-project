import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, expect, test } from 'vitest';

const packageDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const distDir = join(packageDir, 'dist');
const entryFiles = ['index.js', 'index.d.ts'] as const;

const originalContents = new Map<string, string | null>(
  entryFiles.map((fileName) => {
    const filePath = join(distDir, fileName);

    try {
      return [filePath, readFileSync(filePath, 'utf8')] as const;
    } catch {
      return [filePath, null] as const;
    }
  }),
);

afterAll(() => {
  mkdirSync(distDir, { recursive: true });

  for (const [filePath, contents] of originalContents) {
    if (contents === null) {
      continue;
    }

    writeFileSync(filePath, contents, 'utf8');
  }
});

test('build recreates missing shared package entry files', () => {
  mkdirSync(distDir, { recursive: true });

  for (const fileName of entryFiles) {
    rmSync(join(distDir, fileName), { force: true });
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'build'], {
    cwd: packageDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  const processError = result.error?.message ?? result.stderr ?? result.stdout;

  expect(processError).toBeFalsy();
  expect(result.status, result.stderr || result.stdout).toBe(0);

  for (const fileName of entryFiles) {
    const filePath = join(distDir, fileName);
    const contents = readFileSync(filePath, 'utf8');

    expect(contents.length).toBeGreaterThan(0);
  }
});
