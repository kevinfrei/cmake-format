import { describe, expect, test } from 'bun:test';
import { parseCMakeFile } from '../parser';
import { tokenize } from '../tokenizer';
import { ParserTokenType } from '../types';
import { loadFile } from './load-file';

describe('Parser', () => {
  test('parses basic command', () => {
    const input = loadFile('simple.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    expect(ast.statements.length).toBeGreaterThan(0);
  });

  test('parses macros and conditionals', () => {
    const input = loadFile('grammar.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    expect(
      ast.statements.some((s) => s.type === ParserTokenType.MacroDefinition),
    ).toBe(true);
    expect(
      ast.statements.some((s) => s.type === ParserTokenType.ConditionalBlock),
    ).toBe(true);
  });

  test('throws on malformed input 1', () => {
    const input = "add_executable myApp main.cpp  # missing parentheses";
    const tokens = tokenize(input);
    expect(() => parseCMakeFile(tokens, input.split('\n'))).toThrowError(/^Expected .*, got .* 'myApp'$/);
  });

  test('throws on malformed input 2', () => {
    const input = "( this is bad # missing parentheses";
    const tokens = tokenize(input);
    expect(() => parseCMakeFile(tokens, input.split('\n'))).toThrowError(/^Expected statement, got .* '\('$/);
  });

  test('throws on malformed input 3', () => {
    const input = "test(this (is bad # missing parentheses";
    const tokens = tokenize(input);
    expect(() => parseCMakeFile(tokens, input.split('\n'))).toThrowError(/^Unexpected token in argument/);
  });

  test('throws on malformed input 4', () => {
    const input = "if(TRUE)\n# comment";
    const tokens = tokenize(input);
    expect(() => parseCMakeFile(tokens, input.split('\n'))).toThrowError('Missing endif()');
  });
});
