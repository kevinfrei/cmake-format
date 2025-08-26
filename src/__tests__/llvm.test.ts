import { isUndefined } from '@freik/typechk';
import { expect, test } from 'bun:test';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  compareTokensFile,
  llvmRepoExists,
  printFullFile,
} from './test-helpers';

const cmakeFiles: string[] = [];
const llvmPath = llvmRepoExists();

function collectFiles() {
  // If there's an LLVM repo one up from here, go ahead and read it's .cmake files
  if (isUndefined(llvmPath)) {
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
  function findCMakeFiles(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        findCMakeFiles(fullPath);
      } else if (isCMakeFile(entry)) {
        cmakeFiles.push(fullPath);
      }
    }
  }

  // Example usage
  findCMakeFiles(llvmPath); // or any root directory
}

function llvmTestName() {
  collectFiles();
  if (isUndefined(llvmPath)) {
    return 'No LLVM repo found';
  }

  return `Process ${cmakeFiles.length} LLVM CMake files [if the repo exists]`;
}

test(llvmTestName(), async () => {
  // If there's an LLVM repo one up from here, go ahead and read it's .cmake files
  if (isUndefined(llvmPath)) {
    expect(true).toBeTrue();
    return;
  }

  // Example usage
  const failures: { path: string; fileSize: number }[] = [];
  const printFailures: { path: string; fileSize: number }[] = [];
  let success = 0;
  let printSuccess = 0;
  for (const path of cmakeFiles) {
    // Get the file size for sorting of errors:
    const fileSize = statSync(path).size;
    try {
      const printed = printFullFile(path);
      if (fileSize === 0) {
        expect(printed.length).toBe(0);
      } else {
        expect(printed.length).toBeGreaterThan(0);
      }
      success++;
      if (compareTokensFile(path)) {
        printSuccess++;
      } else {
        printFailures.push({ path, fileSize });
      }
    } catch (error) {
      console.error(`Error processing file ${path}:`, error);
      failures.push({ path, fileSize });
    }
  }
  if (failures.length > 0) {
    const failureRate = (
      (failures.length / (success + failures.length)) *
      100
    ).toFixed(2);
    const sortedFailures = failures.sort((a, b) => a.fileSize - b.fileSize);
    const sortedPrintFailures = printFailures.sort(
      (a, b) => a.fileSize - b.fileSize,
    );
    const pfailStr =
      printSuccess !== success
        ? `
Print failures: ${printFailures.length} out of ${success} total
==> ${sortedPrintFailures.map((f) => `${f.path} [${f.fileSize} bytes]`).join('\n==> ')}`
        : '';
    throw new Error(`Failed to process files:
--> ${sortedFailures.map((f) => `${f.path} [${f.fileSize} bytes]`).join('\n--> ')}
Processed files: Failed ${failures.length} out of ${success + failures.length} total.
Failure rate: ${failureRate}%${pfailStr}`);
  }
});
