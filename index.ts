import { readFileSync, writeFileSync } from 'node:fs';
import { parseCMakeFile } from './src/parser';
import { printCMake } from './src/printer';
import { MakeTokenStream } from './src/tokenizer';

function usage() {
  console.error('Usage: cmake-format <file>');
  console.error('or cmake-format (-i/--in-place) <file>');
  // console.error('or "bun start (-i/--in-place) <file>" from the project root');
  process.exit(1);
}

export function printFullFile(path: string): string[] {
  const content = readFileSync(path, 'utf-8');
  const tokens = MakeTokenStream(content);
  const ast = parseCMakeFile(tokens, content.split('\n'));
  return printCMake(ast);
}

if (
  process.argv.length !== 3 &&
  process.argv.length !== 4 &&
  process.argv[2] !== '-i' &&
  process.argv[2] !== '--in-place'
) {
  usage();
}
const filePath = process.argv[process.argv.length - 1]!;

const lines = printFullFile(filePath);
if (process.argv.length === 3) {
  lines.forEach((line) => console.log(line));
} else {
  writeFileSync(filePath, lines.join('\n'), 'utf-8');
}
