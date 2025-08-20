import { describe, expect, test } from 'bun:test';
import {
  MakeTokenStream,
  mkComment,
  mkDirective,
  mkEOF,
  mkIdentifier,
  mkInlineComment,
  mkParen,
  mkQuoted,
  mkVariable,
  TokenType,
  type Token,
} from '../tokenizer';

describe('CMake Tokenizer', () => {
  test('tokenizes basic command', () => {
    const input = `add_executable(myApp main.cpp)`;
    const tokens = MakeTokenStream(input);
    expect(tokens.count()).toBe(6);
    expect(tokens.consume()).toEqual(mkIdentifier('add_executable'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkIdentifier('myApp'));
    expect(tokens.consume()).toEqual(mkIdentifier('main.cpp'));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes quoted strings', () => {
    const input = `message("Hello World")`;
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkIdentifier('message'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkQuoted('Hello World'));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes variable references', () => {
    const input = 'set(VAR ${VALUE})';
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkIdentifier('set'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkIdentifier('VAR'));
    expect(tokens.consume()).toEqual(mkVariable('VALUE'));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes inline comment', () => {
    const input = 'add_library(core STATIC core.cpp) # builds core';
    const tokens = MakeTokenStream(input);
    let last: Token = mkEOF();
    while (tokens.peek().type !== TokenType.EOF) {
      last = tokens.consume();
    }
    expect(last).toEqual(mkInlineComment('# builds core'));
  });

  test('tokenizes directive comment', () => {
    const input = `# @format-off`;
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkDirective('@format-off'));
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes mixed line with code and directive', () => {
    const input = `add_executable(app main.cpp) # @format-off`;
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkIdentifier('add_executable'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkIdentifier('app'));
    expect(tokens.consume()).toEqual(mkIdentifier('main.cpp'));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkDirective('@format-off'));
  });

  test('token end of stream failure', () => {
    const tokens = MakeTokenStream('');
    expect(tokens.consume()).toEqual(mkEOF());
    expect(() => tokens.peek()).toThrow();
  });

  test('tokenizing comments & directives before code', () => {
    const input = '# @format-off\n# comment\nif(test)\n# @format-off\nendif()';
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkDirective('@format-off'));
    expect(tokens.consume()).toEqual(mkComment('# comment'));
    expect(tokens.consume()).toEqual(mkIdentifier('if'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkIdentifier('test'));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkDirective('@format-off'));
    expect(tokens.consume()).toEqual(mkIdentifier('endif'));
    expect(tokens.consume()).toEqual(mkParen('('));
    expect(tokens.consume()).toEqual(mkParen(')'));
    expect(tokens.consume()).toEqual(mkEOF());
  });
});
