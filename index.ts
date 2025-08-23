import { readFileSync } from 'node:fs';
import { parseString } from './src/__tests__/test-helpers';
import { parseCMakeFile } from './src/parser';
import { printCMake } from './src/printer';
import { MakeTokenStream } from './src/tokenizer';

if (process.argv.length !== 3) {
  console.error('Usage: cmake-format <file>');
  console.error('or "bun start <file>" from the project root');
  process.exit(1);
}

export function printFullFile(path: string): string[] {
  const content = readFileSync(path, 'utf-8');
  const tokens = MakeTokenStream(content);
  const ast = parseCMakeFile(tokens, content.split('\n'));
  return printCMake(ast);
}

const filePath = process.argv[2]!;

printFullFile(filePath).forEach((line) => console.log(line));
