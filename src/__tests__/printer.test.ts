import { describe, expect, test } from 'bun:test';
import { parseCMakeFile } from '../parser';
import { printCMake, printCMakeToString } from '../printer';
import {
  compareTokenStreams,
  parseString,
  printString,
  printTestFile,
  tokenizeString,
  tokenizeTestFile,
} from './test-helpers';

describe('Pretty Printer simplistic stuff', () => {
  test('prints basic command', () => {
    const output = printTestFile('simple.cmake');
    expect(output).toContain('add_executable');
  });
  test('Empty file tests', () => {
    expect(printString('').trim()).toBe('');
    const [tokens, original] = tokenizeString('\n\n  \n\t\n');
    const output = parseCMakeFile(tokens, original);
    const printed = printCMake(output);
    const [printedTokens] = tokenizeString(printed.join('\n'));
    expect(tokens.count()).toBe(1);
    expect(printed.join('\n').trim()).toBe('');
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
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
    const lines = output.split('\n');
    lines.forEach((line) => {
      expect(line).toBeDefined();
      expect(line.length).toBeLessThan(81);
    });
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const lines = output.split('\n');
    lines.forEach((line) => {
      expect(line).toBeDefined();
      expect(line.length).toBeLessThan(81);
    });
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-musicdb', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-musicdb.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const lines = output.split('\n');
    lines.forEach((line) => {
      expect(line).toBeDefined();
      expect(line.length).toBeLessThan(81);
    });
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-test', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-test.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const lines = output.split('\n');
    lines.forEach((line) => {
      expect(line).toBeDefined();
      expect(line.length).toBeLessThan(81);
    });
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('read cassette-cpp-tools', () => {
    const [tokens, rawStrings] = tokenizeTestFile('cassette-cpp-tools.cmake');
    const output = printString(rawStrings.join('\n'));
    expect(output).toBeDefined();
    const lines = output.split('\n');
    lines.forEach((line) => {
      expect(line).toBeDefined();
      expect(line.length).toBeLessThan(81);
    });
    const [printedTokens] = tokenizeString(output);
    expect(compareTokenStreams(tokens, printedTokens)).toBeTrue();
  });
  test('check for EOL settings', () => {
    const ast = parseString('if(TRUE)\n# nothing\nendif()');
    const outputUnix = printCMakeToString(ast, { crlf: false });
    const outputWindows = printCMakeToString(ast, { crlf: true });
    expect(outputUnix).toContain('\n');
    expect(outputUnix).not.toContain('\r\n');
    expect(outputWindows).toContain('\r\n');
  });
});
