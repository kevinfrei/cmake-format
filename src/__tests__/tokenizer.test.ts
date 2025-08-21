import { describe, expect, test } from 'bun:test';
import {
  MakeBracket,
  MakeComment,
  MakeEOF,
  MakeTokenStream,
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
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('tokenizes quoted strings', () => {
    const input = `message("Hello World")`;
    const tokens = MakeTokenStream(input);
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Quoted, 'Hello World')).toBeDefined;
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('tokenizes variable references', () => {
    const input = 'set(VAR ${VALUE})';
    const tokens = MakeTokenStream(input);
    expect(tokens.expectIdentifier()).toEqual('set');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expectIdentifier()).toEqual('VAR');
    expect(tokens.expect(TokenType.Variable, 'VALUE')).toBeDefined();
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('tokenizes inline comment', () => {
    const input = 'add_library(core STATIC core.cpp) # builds core';
    const tokens = MakeTokenStream(input);
    let last: Token = MakeEOF();
    while (!tokens.peek().is(TokenType.EOF)) {
      last = tokens.consume();
    }
    expect(last.is(TokenType.TailComment, '# builds core')).toBeTrue();
  });

  test('tokenizes directive comment', () => {
    const input = `# @format-off`;
    const tokens = MakeTokenStream(input);
    expect(tokens.expect(TokenType.Directive, '@format-off')).toBeDefined();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
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
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('token end of stream failure', () => {
    const tokens = MakeTokenStream('');
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
    expect(() => tokens.peek()).toThrow();
  });

  test('comments', () => {
    const tokens = MakeTokenStream('# Comment should eat the "quote"');
    expect(
      tokens.expect(TokenType.Comment, '# Comment should eat the "quote"'),
    ).toBeDefined();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
    const tokens2 = MakeTokenStream(
      'thing_here() # Comment should eat the "quote"',
    );
    expect(tokens2.expectIdentifier()).toEqual('thing_here');
    expect(tokens2.expectOpen()).toBeTrue();
    expect(tokens2.expectClose()).toBeTrue();
    expect(
      tokens2.expect(TokenType.TailComment, '# Comment should eat the "quote"'),
    ).toBeDefined();
    expect(tokens2.expect(TokenType.EOF)).toBeDefined();
  });

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
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });
});

describe('(FAILING): Tokenizer tests (all 6 failing)', () => {
  // Go look at https://cmake.org/cmake/help/latest/manual/cmake-language.7.html for details

  test('quoted comment (fix this now!)', () => {
    const tokens = MakeTokenStream("message(\"Hello#World\")");
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Quoted, '"Hello#World"')).toBeDefined();
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('escape sequence', () => {
    const tokens = MakeTokenStream('test(SINGLE\\ ARGUMENT\\;HERE)');
    expect(tokens.expectIdentifier()).toEqual('test');
    expect(tokens.expectOpen()).toBeTrue();
    expect(
      tokens.expect(TokenType.Identifier, 'SINGLE\\ ARGUMENT'),
    ).toBeDefined();
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.consume().is(TokenType.EOF)).toBeTrue();
  });

  test('multiline quoted string', () => {
    const tokens = MakeTokenStream('message("Hello\\nWorld")');
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Quoted, 'Hello\nWorld')).toBeDefined();
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toBeDefined();
  });

  test('multiline bracketed string', () => {
    const tokens = MakeTokenStream('message([==[Hello\nWorld]==])');
    expect(tokens.expectIdentifier()).toEqual('message');
    expect(tokens.expectOpen()).toBeTrue();
    expect(tokens.expect(TokenType.Bracketed)).toEqual(
      MakeBracket('Hello\nWorld', 2),
    );
    expect(tokens.expectClose()).toBeTrue();
    expect(tokens.expect(TokenType.EOF)).toEqual(MakeEOF());
  });

  test('multiline bracket simple', () => {
    const tokens = MakeTokenStream('#[[Hello\nWorld]]');
    expect(tokens.expect(TokenType.Comment)).toEqual(
      MakeComment('#[=[Hello\nWorld]=]'),
    );
    tokens.expect(TokenType.EOF);
  });

  test('multiline bracket comment', () => {
    const tokens = MakeTokenStream('#[=[H[==[ello\nWorld]===]=]');
    expect(tokens.expect(TokenType.Comment)).toEqual(
      MakeComment('#[=[H[==[ello\nWorld]===]=]'),
    );
    tokens.expect(TokenType.EOF);
  });
});
