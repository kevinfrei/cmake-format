import { isUndefined } from '@freik/typechk';
import { expect, test } from 'bun:test';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  compareTokensFile,
  llvmRepoExists,
  printFullFile,
} from './test-helpers';

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
  const printFailures: string[] = [];
  let success = 0;
  let printSuccess = 0;
  for (const path of cmakeFiles) {
    console.log(path);
    try {
      const printed = printFullFile(path);
      expect(printed.length).toBeGreaterThan(0);
      success++;
      if (compareTokensFile(path)) {
        printSuccess++;
      } else {
        printFailures.push(path);
      }
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
    throw new Error(`Failed to process files:
--> ${failures.join('\n--> ')}
Processed files: Failed ${failures.length} out of ${success + failures.length} total.
Failure rate: ${failureRate}%
Print failures: ${printFailures.length} out of ${success} total
==> ${printFailures.join('\n==> ')}`);
  }
});

/* Printed files tokenize differently as of 8AM PDT 23 Aug 2025:

llvm/clang/examples/LLVMPrintFunctionNames/CMakeLists.txt
llvm/clang/examples/PrintFunctionNames/CMakeLists.txt
llvm/compiler-rt/lib/orc/CMakeLists.txt
llvm/compiler-rt/lib/xray/CMakeLists.txt
llvm/compiler-rt/test/CMakeLists.txt
llvm/flang/runtime/Float128Math/CMakeLists.txt
llvm/flang/tools/flang-driver/CMakeLists.txt
llvm/libcxx/cmake/Modules/HandleLibC.cmake
llvm/libcxx/cmake/Modules/HandleLibCXXABI.cmake
llvm/lld/CMakeLists.txt
llvm/openmp/runtime/cmake/LibompHandleFlags.cmake
llvm/openmp/runtime/cmake/LibompMicroTests.cmake
llvm/polly/unittests/CMakeLists.txt

(With 217 failures to just tokenize the original)

*/
