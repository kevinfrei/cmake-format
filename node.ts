#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { loadConfig, type Configuration } from './src/config.js';
import { expando } from './src/node-helpers.js';
import { parseCMakeFile } from './src/parser.js';
import { printCMakeToString } from './src/printer.js';
import { MakeTokenStream } from './src/tokenizer.js';

const appName = 'passable-node';

function usage() {
  console.error(`Usage: ${appName} <files...>`);
  console.error(`or ${appName} (-i/--in-place) <files...>`);
  process.exit(1);
}

export function printFullFile(
  path: string,
  config: Partial<Configuration>,
): string {
  const content = readFileSync(path, 'utf-8');
  const tokens = MakeTokenStream(content);
  const ast = parseCMakeFile(tokens, content.split('\n'));
  return printCMakeToString(ast, config);
}

if (
  process.argv.length < 3 ||
  (process.argv.length === 3 &&
    (process.argv[2] === '-i' || process.argv[2] === '--in-place'))
) {
  usage();
}
const inPlace = process.argv[2] === '-i' || process.argv[2] === '--in-place';
const filePaths = inPlace ? process.argv.slice(3) : process.argv.slice(2);

// TODO: Load settings from .passable.json or .passablerc
const allFiles = expando(filePaths);
if (inPlace) {
  console.time('Total Formatting Time');
}
const config = loadConfig();
allFiles.forEach((filePath) => {
  if (inPlace) {
    console.time(`Formatting Time: ${filePath}`);
  }
  const lines = printFullFile(filePath, config);
  if (inPlace) {
    // TODO: Handle UTF-8 properly. I still need to use binary mode so that
    // Windows won't add a CRLF line ending when the file is written with LF
    // endings. The text/utf-8 output code would foil it.
    writeFileSync(filePath, lines, 'binary');
  } else {
    console.log(lines);
  }
  if (inPlace) {
    console.timeEnd(`Formatting Time: ${filePath}`);
  }
});
if (inPlace) {
  console.timeEnd('Total Formatting Time');
}
