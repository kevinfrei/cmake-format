import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Configuration } from '../config';
import type { CMakeFile } from '../parser';
import { parseCMakeFile } from '../parser';
import { printCMake, printCMakeToString } from '../printer';
import {
  MakeTokenStream,
  Token,
  TokenType,
  type TokenStream,
} from '../tokenizer';

export function getTestFileName(name: string): string {
  return join(import.meta.dir, 'inputs', name);
}

function loadFile(name: string): string {
  return readFileSync(name, 'utf-8').trim();
}

export function llvmRepoExists(): string | undefined {
  if (existsSync(join(import.meta.dir, '../../../llvm'))) {
    return join(import.meta.dir, '../../../llvm');
  }
}

export function tokenizeString(content: string): [TokenStream, string[]] {
  return [MakeTokenStream(content), content.split('\n')];
}

export function tokenizeTestFile(filePath: string): [TokenStream, string[]] {
  return tokenizeString(loadFile(getTestFileName(filePath)));
}

export function parseTestFile(filename: string): CMakeFile {
  const [tokens, input] = tokenizeTestFile(filename);
  return parseCMakeFile(tokens, input);
}

export function parseString(content: string): CMakeFile {
  const [tokens, input] = tokenizeString(content);
  return parseCMakeFile(tokens, input);
}

export function printString(
  content: string,
  cfg: Partial<Configuration> = {},
): string {
  return printCMake(parseString(content), cfg).join('\n');
}

export function printTestFile(filePath: string): string {
  return printCMake(parseTestFile(filePath)).join('\n');
}

export function printFullFile(path: string): string {
  return printCMakeToString(parseString(readFileSync(path, 'utf-8')));
}

export function compareTokenStreams(
  streamA: TokenStream,
  streamB: TokenStream,
): true | string {
  streamA.reset();
  streamB.reset();
  let tokenA: Token;
  let tokenB: Token;
  while (true) {
    while (streamA.peek().type === TokenType.EmptyLine) {
      tokenA = streamA.consume();
    }
    tokenA = streamA.peek();
    while (streamB.peek().type === TokenType.EmptyLine) {
      tokenB = streamB.consume();
    }
    tokenB = streamB.peek();
    if (
      tokenA.type !== tokenB.type ||
      tokenA.value?.toLocaleUpperCase() !== tokenB.value?.toLocaleUpperCase()
    ) {
      return `${tokenA} !== ${tokenB}`;
    }
    if (tokenA.type === TokenType.EOF && tokenB.type === TokenType.EOF) {
      return true;
    }
    streamA.consume();
    streamB.consume();
  }
}

export function compareASTs(astA: CMakeFile, astB: CMakeFile): boolean {
  // Compare the two ASTs for structural equality.
  return (
    JSON.stringify(astA).toLocaleUpperCase() ===
    JSON.stringify(astB).toLocaleUpperCase()
  );
}

export function compareTokensFile(filename: string): boolean {
  const content = loadFile(filename);
  const [streamA] = tokenizeString(content);
  const [streamB] = tokenizeString(printString(content));
  return compareTokenStreams(streamA, streamB);
}

export function compareASTsFile(filename: string): boolean {
  const content = loadFile(filename);
  const astA = parseString(content);
  const astB = parseString(printString(content));
  return compareASTs(astA, astB);
}
