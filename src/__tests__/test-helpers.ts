import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CMakeFile } from '../parser';
import { parseCMakeFile } from '../parser';
import { printCMake } from '../printer';
import { MakeTokenStream, type TokenStream } from '../tokenizer';

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

export function printString(content: string): string {
  return printCMake(parseString(content)).join('\n');
}

export function printTestFile(filePath: string): string {
  return printCMake(parseTestFile(filePath)).join('\n');
}

export function printFullFile(path: string): string[] {
  return printCMake(parseString(readFileSync(path, 'utf-8')));
}

export function compareTokenStreams(
  streamA: TokenStream,
  streamB: TokenStream,
): boolean {
  if (streamA.count() !== streamB.count()) {
    return false;
  }
  for (let i = 0; i < streamA.count(); i++) {
    const tokenA = streamA.consume();
    const tokenB = streamB.consume();
    if (tokenA.type !== tokenB.type || tokenA.value !== tokenB.value) {
      return false;
    }
  }
  return true;
}

export function compareTokensFile(filename: string): boolean {
  const content = loadFile(filename);
  const [streamA, ] = tokenizeString(content);
  const [streamB, ] = tokenizeString(printString(content));
  return compareTokenStreams(streamA, streamB);
}