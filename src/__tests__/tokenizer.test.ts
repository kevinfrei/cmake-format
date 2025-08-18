import { describe, expect, test } from 'bun:test';
import { tokenize } from '../tokenizer';
import {
  mkEOF,
  mkIdentifier,
  mkParen,
  mkQuoted,
  mkVariable,
  TokenType,
} from '../types';

describe('CMake Tokenizer', () => {
  test('tokenizes basic command', () => {
    const input = `add_executable(myApp main.cpp)`;
    const tokens = tokenize(input);
    expect(tokens.length).toBe(6);
    expect(tokens[0]).toEqual(mkIdentifier('add_executable'));
    expect(tokens[1]).toEqual(mkParen('('));
    expect(tokens[2]).toEqual(mkIdentifier('myApp'));
    expect(tokens[3]).toEqual(mkIdentifier('main.cpp'));
    expect(tokens[4]).toEqual(mkParen(')'));
    expect(tokens[5]).toEqual(mkEOF());
  });

  test('tokenizes quoted strings', () => {
    const input = `message("Hello World")`;
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      mkIdentifier('message'),
      mkParen('('),
      mkQuoted('Hello World'),
      mkParen(')'),
      mkEOF(),
    ]);
  });

  test('tokenizes variable references', () => {
    const input = 'set(VAR ${VALUE})';
    const tokens = tokenize(input);
    expect(tokens).toEqual([
      mkIdentifier('set'),
      mkParen('('),
      mkIdentifier('VAR'),
      mkVariable('VALUE'),
      mkParen(')'),
      mkEOF(),
    ]);
  });

  test('tokenizes inline comment', () => {
    const input = 'add_library(core STATIC core.cpp) # builds core';
    const tokens = tokenize(input);
    expect(tokens.some((t) => t.type === TokenType.Comment)).toBe(true);
  });

  test('tokenizes directive comment', () => {
    const input = `# @format-off`;
    const tokens = tokenize(input);
    expect(tokens).toEqual([mkIdentifier('@format-off'), mkEOF()]);
  });

  test('tokenizes mixed line with code and directive', () => {
    const input = `add_executable(app main.cpp) # @format-off`;
    const tokens = tokenize(input);
    expect(tokens).toContainEqual(mkIdentifier('@format-off'));
  });
});
