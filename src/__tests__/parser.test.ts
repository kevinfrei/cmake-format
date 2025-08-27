import { describe, expect, test } from 'bun:test';
import { ASTNode } from '../parser';
import { parseString, parseTestFile } from './test-helpers';

describe('Parser', () => {
  test('parses basic command', () => {
    const ast = parseTestFile('simple.cmake');
    expect(ast.statements.length).toBeGreaterThan(0);
  });

  test('parses macros and conditionals', () => {
    const ast = parseTestFile('grammar.cmake');
    expect(
      ast.statements.some((s) => s.type === ASTNode.PairedCall),
    ).toBeTrue();
    expect(
      ast.statements.some((s) => s.type === ASTNode.ConditionalBlock),
    ).toBeTrue();
  });

  test('throws on malformed input 1', () => {
    const input = 'add_executable myApp main.cpp  # missing parentheses';
    expect(() => parseString(input)).toThrow();
  });

  test('throws on malformed input 2', () => {
    const input = '( this is bad # missing parentheses';
    expect(() => parseString(input)).toThrow();
  });

  test('throws on malformed input 3', () => {
    const input = 'test(this (is bad # missing parentheses';
    expect(() => parseString(input)).toThrow();
  });

  test('throws on malformed input 4', () => {
    const input = 'if(TRUE)\n# comment';
    expect(() => parseString(input)).toThrow();
  });

  test('block/endblock pairing', () => {
    const input =
      'block()\n# stuff in here?\n # nope!\nendblock()\n' +
      'if(TRUE)\n#[==[ Nothing Here\n]==]\nendif()\n';
    const ast = parseString(input);
    expect(ast.statements.length).toBe(2);
    expect(ast.statements[0]!.type).toBe(ASTNode.PairedCall);
    expect(ast.statements[1]!.type).toBe(ASTNode.ConditionalBlock);
  });
});
