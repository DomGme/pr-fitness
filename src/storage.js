import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_FILE = 'data.json';

const DEFAULT_DATA = {
  profile: null,
  dailyChoice: null,
  log: [],
};

export function getDefaultDir() {
  return join(process.env.HOME || process.env.USERPROFILE, '.pr-fitness');
}

export function getDataPath(dir) {
  return join(dir, DATA_FILE);
}

export function loadData(dir = getDefaultDir()) {
  const filePath = getDataPath(dir);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { ...DEFAULT_DATA };
    }
    throw err;
  }
}

export function saveData(dir = getDefaultDir(), data) {
  mkdirSync(dir, { recursive: true });
  const filePath = getDataPath(dir);
  const tmpPath = join(dir, `.data-${randomUUID()}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmpPath, filePath);
}
