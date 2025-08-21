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
    expect(tokens.expectIdentifier()).toEqual('add_executable');
    expect(tokens.expectOpen()).toBeTrue(); 
    expect(tokens.expectIdentifier()).toEqual('myApp');
    expect(tokens.expectIdentifier()).toEqual('main.cpp');
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes quoted strings', () => {
    const input = `message("Hello World")`;
    const tokens = MakeTokenStream(input);
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Quoted, 'Hello World')).toBeDefined;
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes variable references', () => {
    const input = 'set(VAR ${VALUE})';
    const tokens = MakeTokenStream(input);
    expect(tokens.expectIdentifier()).toEqual('set');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expectIdentifier()).toEqual('VAR');
    expect(tokens.expect(TokenType.Variable, 'VALUE')).toBeDefined();
    expect(tokens.expectClose()).toBeTrue();
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
    expect(tokens.expect(TokenType.Directive, '@format-off')).toBeDefined();
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('tokenizes mixed line with code and directive', () => {
    const input = `add_executable(app main.cpp) # @format-off`;
    const tokens = MakeTokenStream(input);
    expect(tokens.expectIdentifier()).toEqual('add_executable');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expectIdentifier()).toEqual('app');
    expect(tokens.expectIdentifier()).toEqual('main.cpp');
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.Directive, '@format-off')).toBeDefined();
  });

  test('token end of stream failure', () => {
    const tokens = MakeTokenStream('');
    expect(tokens.consume()).toEqual(mkEOF());
    expect(() => tokens.peek()).toThrow();
  });

  test('comments', () => {
    const tokens = MakeTokenStream('# Comment should eat the "quote"');
    expect(tokens.expect(TokenType.Comment, '# Comment should eat the "quote"')).toBeDefined();
    expect(tokens.consume()).toEqual(mkEOF());
    const tokens2 = MakeTokenStream('thing_here() # Comment should eat the "quote"');
    expect(tokens2.expectIdentifier()).toEqual('thing_here');
    expect(tokens2.expectOpen()).toBeTrue();
    expect(tokens2.expectClose()).toBeTrue();
    expect(tokens2.expect(TokenType.TailComment, '# Comment should eat the "quote"')).toBeDefined();
    expect(tokens2.consume()).toEqual(mkEOF());
  })

  test('tokenizing comments & directives before code', () => {
    const input = '# @format-off\n# comment\nif(test)\n# @format-off\nendif()';
    const tokens = MakeTokenStream(input);
    expect(tokens.expect(TokenType.Directive, '@format-off')).toBeDefined();
    expect(tokens.expect(TokenType.Comment, '# comment')).toBeDefined();
    expect(tokens.expectIdentifier()).toEqual('if');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expectIdentifier()).toEqual('test');
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.Directive, '@format-off')).toBeDefined();
    expect(tokens.expectIdentifier()).toEqual('endif');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.consume()).toEqual(mkEOF());
  });
});

describe('(FAILING): Tokenizer tests (all 5 failing)', () => {
  // Go look at https://cmake.org/cmake/help/latest/manual/cmake-language.7.html for details
  test('escape sequence', () => {
    const tokens = MakeTokenStream("test(SINGLE\\ ARGUMENT\\;HERE)");
    expect(tokens.expectIdentifier()).toEqual('test');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Identifier)).toEqual('SINGLE\\ ARGUMENT');
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.consume()).toEqual(mkEOF());
  });

  test('multiline quoted string', () => {
    const tokens = MakeTokenStream("message(\"Hello\\nWorld\")");
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue()
    expect(tokens.expect(TokenType.Quoted)).toEqual('Hello\nWorld');
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('multiline bracketed string', () => {
    const tokens = MakeTokenStream("message([==[Hello\nWorld]==])");
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Bracketed)).toEqual(mkBracket('Hello\nWorld', 2));
    expect(tokens.expectClose()).toBeTrue();
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
