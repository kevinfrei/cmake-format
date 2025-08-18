import { readFileSync } from 'fs';
import { join } from 'path';

export function loadFile(name: string): string {
  return readFileSync(join(import.meta.dir, 'inputs', name), 'utf-8').trim();
}
