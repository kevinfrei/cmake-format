import { isUndefined } from '@freik/typechk';
import { expect, test } from 'bun:test';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { llvmRepoExists, printFullFile } from './test-helpers';

test('(FAILING): Try to process all the LLVM CMake files', async () => {
  // If there's an LLVM repo one up from here, go ahead and read it's .cmake files
  const llvmPath = llvmRepoExists();
  if (isUndefined(llvmPath)) {
    expect(true).toBeTrue();
    return;
  }
  /*
  if (!isUndefined(llvmPath)) {
    expect(true).toBeTrue();
    return;
  }
*/
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

  const bolt = printFullFile(
    join(llvmPath, 'bolt/cmake/modules/AddBOLT.cmake'),
  );
  expect(bolt.length).toBeGreaterThan(0);
  // Example usage
  const cmakeFiles = findCMakeFiles(llvmPath); // or any root directory
  const failures: string[] = [];
  let success = 0;
  for (const path of cmakeFiles) {
    console.log(path);
    try {
      const printed = printFullFile(path);
      expect(printed.length).toBeGreaterThan(0);
      success++;
    } catch (error) {
      console.error(`Error processing file ${path}:`, error);
      failures.push(path);
    }
  }
  if (failures.length > 0) {
    const failureRate = (
      (failures.length / (success + failures.length)) *
      100
    ).toFixed(2);
    throw new Error(
      `Failed to process files:\n--> ${failures.join('\n--> ')}\n` +
        `Processed files: Failed ${failures.length} out of ${success + failures.length} total.\n` +
        `Failure rate: ${failureRate}%`,
    );
  }
});
