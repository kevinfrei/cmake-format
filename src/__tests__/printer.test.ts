import { describe, expect, test } from 'bun:test';
import { printFile } from './test-helpers';

describe('Pretty Printer', () => {
  test('prints basic command', () => {
    const output = printFile('simple.cmake');
    expect(output).toContain('add_executable');
  });

  test('preserves comments', () => {
    const output = printFile('comments.cmake');
    expect(output).toContain('# builds main app');
  });

  test('respects format directives', () => {
    const output = printFile('directives.cmake');
    expect(output).toContain('@format-off');
    expect(output).toContain('target_link_libraries');
  });

  test('handles macros and conditionals', () => {
    const output = printFile('grammar.cmake');
    expect(output).toContain('macro(my_macro');
    expect(output).toContain('if(BUILD_TESTS)');
    expect(output).toContain('endif()');
  });
});

describe('Just printing files', () => {
  test('read cassette', () => {
    const output3 = printFile('lotsa-files/cassette.cmake');
    expect(output3).toBeDefined();
  });
  test('read cassette-cpp', () => {
    const output5 = printFile('lotsa-files/cassette-cpp.cmake');
    expect(output5).toBeDefined();
  });
  test('read cassette-cpp-musicdb', () => {
    const output1 = printFile('lotsa-files/cassette-cpp-musicdb.cmake');
    expect(output1).toBeDefined();
  });
  test('read cassette-cpp-test', () => {
    const output4 = printFile('lotsa-files/cassette-cpp-test.cmake');
    expect(output4).toBeDefined();
  });
  test('read cassette-cpp-tools', () => {
    const output2 = printFile('lotsa-files/cassette-cpp-tools.cmake');
    expect(output2).toBeDefined();
  });
});
