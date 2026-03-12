import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function createTestDir() {
  return mkdtempSync(join(tmpdir(), 'pr-fitness-test-'));
}

export function cleanTestDir(dir) {
  rmSync(dir, { recursive: true, force: true });
}
