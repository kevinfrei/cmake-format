import { describe, expect, test } from 'bun:test';
import { ParserTokenType } from '../parser';
import { parseFile, parseString } from './test-helpers';

describe('Parser', () => {
  test('parses basic command', () => {
    const ast = parseFile('simple.cmake');
    expect(ast.statements.length).toBeGreaterThan(0);
  });

  test('parses macros and conditionals', () => {
    const ast = parseFile('grammar.cmake');
    expect(
      ast.statements.some((s) => s.type === ParserTokenType.MacroDefinition),
    ).toBe(true);
    expect(
      ast.statements.some((s) => s.type === ParserTokenType.ConditionalBlock),
    ).toBe(true);
  });

  test('throws on malformed input 1', () => {
    const input = 'add_executable myApp main.cpp  # missing parentheses';
    expect(() => parseString(input)).toThrowError(
      /^Expected .*, got .* 'myApp'$/,
    );
  });

  test('throws on malformed input 2', () => {
    const input = '( this is bad # missing parentheses';
    expect(() => parseString(input)).toThrowError(
      /^Expected statement, got .* '\('$/,
    );
  });

  test('throws on malformed input 3', () => {
    const input = 'test(this (is bad # missing parentheses';
    expect(() => parseString(input)).toThrowError(
      /^Unexpected token in argument/,
    );
  });

  test('throws on malformed input 4', () => {
    const input = 'if(TRUE)\n# comment';
    expect(() => parseString(input)).toThrowError('Missing endif()');
  });
});
