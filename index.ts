#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs';
import { parseCMakeFile } from './src/parser';
import { getEOL, printCMake } from './src/printer';
import { MakeTokenStream } from './src/tokenizer';

const appName = process.argv[1]!.split(/[\\/]/).pop();

function usage() {
  console.error(`Usage: ${appName} <files...>`);
  console.error(`or ${appName} (-i/--in-place) <files...>`);
  // console.error(`or "bun start (-i/--in-place) <files...>" from the project root`);
  process.exit(1);
}

export function printFullFile(path: string): string[] {
  const content = readFileSync(path, 'utf-8');
  const tokens = MakeTokenStream(content);
  const ast = parseCMakeFile(tokens, content.split('\n'));
  return printCMake(ast);
}

if (
  process.argv.length < 3 ||
  (process.argv.length === 3 &&
    process.argv[2] !== '-i' &&
    process.argv[2] !== '--in-place')
) {
  usage();
}
const inPlace = process.argv[2] === '-i' || process.argv[2] === '--in-place';
const filePaths = inPlace ? process.argv.slice(3) : process.argv.slice(2);

// TODO: Load settings from .passable.json or .passablerc

filePaths.forEach((filePath) => {
  const lines = printFullFile(filePath);
  if (!inPlace) {
    lines.forEach((line) => console.log(line));
  } else {
    // TODO: Handle UTF-8 properly. I still need to use binary mode so that
    // Windows won't add a CRLF line ending when the file is written with LF
    // endings. The text/utf-8 output code would foil it.
    writeFileSync(filePath, lines.join(getEOL()), 'binary');
  }
});
