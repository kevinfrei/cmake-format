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

export function tokenizeFile(filePath: string): [TokenStream, string[]] {
  const input = loadFile(filePath);
  return [MakeTokenStream(input), input.split('\n')];
}
export function parseFile(filename: string): CMakeFile {
  const [tokens, input] = tokenizeFile(filename);
  return parseCMakeFile(tokens, input);
}

export function printFile(filePath: string): string {
  const ast = parseFile(filePath);
  return printCMake(ast).join('\n');
}
