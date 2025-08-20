import { describe, expect, test } from 'bun:test';
import {
  MakeTokenStream,
  mkBracket,
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
    expect(tokens.expectOpen()).toBe(true); 
    expect(tokens.consume()).toEqual(mkIdentifier('myApp'));
    expect(tokens.consume()).toEqual(mkIdentifier('main.cpp'));
    expect(tokens.expectClose()).toBe(true);
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes quoted strings', () => {
    const input = `message("Hello World")`;
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkIdentifier('message'));
    expect(tokens.expectOpen()).toBe(true);
    expect(tokens.consume()).toEqual(mkQuoted('Hello World'));
    expect(tokens.expectClose()).toBe(true);
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes variable references', () => {
    const input = 'set(VAR ${VALUE})';
    const tokens = MakeTokenStream(input);
    expect(tokens.consume()).toEqual(mkIdentifier('set'));
    expect(tokens.expectOpen()).toBe(true);
    expect(tokens.consume()).toEqual(mkIdentifier('VAR'));
    expect(tokens.consume()).toEqual(mkVariable('VALUE'));
    expect(tokens.expectClose()).toBe(true);
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

  test('comments', () => {
    const tokens = MakeTokenStream('# Comment should eat the "quote"');
    expect(tokens.consume()).toEqual(mkComment('# Comment should eat the "quote"'));
    expect(tokens.consume()).toEqual(mkEOF());
    const tokens2 = MakeTokenStream('thing_here() # Comment should eat the "quote"');
    expect(tokens2.consume()).toEqual(mkIdentifier('thing_here'));
    expect(tokens2.expectOpen()).toBe(true);
    expect(tokens2.expectClose()).toBe(true);
    expect(tokens2.consume()).toEqual(mkInlineComment('# Comment should eat the "quote"'));
    expect(tokens2.consume()).toEqual(mkEOF());
  })

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
    expect(tokens.expectOpen()).toBe(true);
    expect(tokens.expectClose()).toBe(true);
    expect(tokens.consume()).toEqual(mkEOF());
  });
});

describe('(FAILING): Tokenizer tests (all 5 failing)', () => {
  // Go look at https://cmake.org/cmake/help/latest/manual/cmake-language.7.html for details
  test('escape sequence', () => {
    const tokens = MakeTokenStream("test(SINGLE\\ ARGUMENT\\;HERE)");
    expect(tokens.consume()).toEqual(mkIdentifier('test'));
    expect(tokens.expectOpen()).toBe(true);
    expect(tokens.consume()).toEqual(mkIdentifier('SINGLE\\ ARGUMENT'));
    expect(tokens.expectClose()).toBe(true);
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('multiline quoted string', () => {
    const tokens = MakeTokenStream("message(\"Hello\\nWorld\")");
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue()
    expect(tokens.expect(TokenType.Quoted)).toEqual(mkQuoted('Hello\nWorld'));
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toEqual(mkEOF());
  });

  test('multiline bracketed string', () => {
    const tokens = MakeTokenStream("message([==[Hello\nWorld]==])");
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBe(true);
    expect(tokens.expect(TokenType.Bracketed)).toEqual(mkBracket('Hello\nWorld', 2));
    expect(tokens.expectClose()).toBe(true);
    expect(tokens.expect(TokenType.EOF)).toEqual(mkEOF());
  });

  test('multiline bracket simple', () => {
    const tokens = MakeTokenStream('#[[Hello\nWorld]]');
    expect(tokens.expect(TokenType.Comment)).toEqual(mkComment('#[=[Hello\nWorld]=]'));
    tokens.expect(TokenType.EOF);
  });

  test('multiline bracket comment', () => {
    const tokens = MakeTokenStream('#[=[H[==[ello\nWorld]===]=]');
    expect(tokens.expect(TokenType.Comment)).toEqual(mkComment('#[=[H[==[ello\nWorld]===]=]'));
    tokens.expect(TokenType.EOF);
  });
});
