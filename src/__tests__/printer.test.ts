import { describe, expect, test } from 'bun:test';
import {
  compareTokenStreams,
  printTestFile,
  printString,
  tokenizeTestFile,
  tokenizeString,
} from './test-helpers';

describe('Pretty Printer', () => {
  test('prints basic command', () => {
    const output = printTestFile('simple.cmake');
    expect(output).toContain('add_executable');
  });

  test('preserves comments', () => {
    const output = printTestFile('comments.cmake');
    expect(output).toContain('# builds main app');
  });

  test('respects format directives', () => {
    const output = printTestFile('directives.cmake');
    expect(output).toContain('@format-off');
    expect(output).toContain('target_link_libraries');
  });

  test('handles macros and conditionals', () => {
    const output = printTestFile('grammar.cmake');
    expect(output).toContain('macro(my_macro');
    expect(output).toContain('if(BUILD_TESTS)');
    expect(output).toContain('endif()');
  });
});

describe('Token Stream preservation', () => {
  test('read cassette', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-musicdb', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-musicdb.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-test', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-test.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-tools', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-tools.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
});
