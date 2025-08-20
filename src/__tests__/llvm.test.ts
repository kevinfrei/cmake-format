import { isUndefined } from '@freik/typechk';
import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { llvmRepoExists, printFile } from './load-file';
import { MakeTokenStream } from '../tokenizer';
import { parseCMakeFile } from '../parser';
import { printCMake } from '../printer';

test('Try to process all the LLVM CMake files', async () => {
  // If there's an LLVM repo one up from here, go ahead and read it's .cmake files
  const llvmPath = llvmRepoExists();
  if (isUndefined(llvmPath)) {
    expect(true).toBeTrue();
    return;
  }

  // Match files named "CMakeLists.txt" or ending in ".cmake"
  function isCMakeFile(filename: string): boolean {
    return (
      filename === 'CMakeLists.txt' ||
      (filename.endsWith('.cmake') &&
        // We don't want any of the foo.h.cmake files...
        filename.indexOf('.') === filename.length - 6)
    );
  }

  // Recursively collect matching files
  function findCMakeFiles(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        findCMakeFiles(fullPath, results);
      } else if (isCMakeFile(entry)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  // Example usage
  const cmakeFiles = findCMakeFiles(llvmPath); // or any root directory
  for (const path of cmakeFiles) {
    console.log(path);
    const input = readFileSync(path, 'utf-8').trim();
    const tokens = MakeTokenStream(input);
    const parsed = parseCMakeFile(tokens, input.split('\n'));
    const printed  = printCMake(parsed);
    expect(printed.length).toBeGreaterThan(0);
  }
});
