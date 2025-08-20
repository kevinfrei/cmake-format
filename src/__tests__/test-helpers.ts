import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CMakeFile } from '../parser';
import { parseCMakeFile } from '../parser';
import { printCMake } from '../printer';
import { MakeTokenStream, type TokenStream } from '../tokenizer';

export function loadFile(name: string): string {
  return readFileSync(join(import.meta.dir, 'inputs', name), 'utf-8').trim();
}

export function llvmRepoExists(): string | undefined {
  if (existsSync(join(import.meta.dir, '../../../llvm'))) {
    return join(import.meta.dir, '../../../llvm');
  }
}

export function tokenizeString(content: string): [TokenStream, string[]] {
  return [MakeTokenStream(content), content.split('\n')];
}

export function tokenizeFile(filePath: string): [TokenStream, string[]] {
  return tokenizeString(loadFile(filePath));
}

export function parseFile(filename: string): CMakeFile {
  const [tokens, input] = tokenizeFile(filename);
  return parseCMakeFile(tokens, input);
}

export function parseString(content: string): CMakeFile {
  const [tokens, input] = tokenizeString(content);
  return parseCMakeFile(tokens, input);
}

export function printString(content: string): string {
  return printCMake(parseString(content)).join('\n');
}

export function printFile(filePath: string): string {
  return printCMake(parseFile(filePath)).join('\n');
}

export function printFullFile(path: string): string[] {
  return printCMake(parseString(readFileSync(path, 'utf-8')));
}
