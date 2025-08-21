// Tokenizer types

import { isString, isUndefined } from '@freik/typechk';

// This should be faster, but the strings make it more debuggable
export enum NumberedTokenType {
  Identifier, // = 'identifier',
  Quoted, // = 'quoted',
  Bracketed, // = 'bracketed',
  Variable, // = 'variable',
  Paren, // = 'paren',
  Comment, // = 'comment',
  TailComment, // = 'tail_comment',
  Directive, // = 'directive',
  EOF, // = 'eof',
}

export enum TokenType {
  Identifier = 'identifier',
  Quoted = 'quoted',
  Bracketed = 'bracketed',
  Variable = 'variable',
  Paren = 'paren',
  Comment = 'comment',
  TailComment = 'tail_comment',
  Directive = 'directive',
  EOF = 'eof',
}

/*
export type TxtPos = {
  line: number;
  col: number;
};

export type Position = { pos: TxtPos };
*/

export type Directives = '@format-on' | '@format-off';

export type Token = {
  is: (type: TokenType, val?: string) => boolean;
  isOpenParen: () => boolean;
  isCloseParen: () => boolean;
  isComment: () => boolean;
  isIdentifier: (val?: string | string[]) => boolean;
  toString: () => string;
  type: () => TokenType;
  value: () => string | undefined;
};

export type TokenStream = {
  peek: () => Token;
  consume: () => Token;
  expect: (type: TokenType, value?: string) => Token;
  expectIdentifier: () => string;
  expectOpen: () => boolean;
  expectClose: () => boolean;
  count: () => number;
  history: (num: number) => Token[];
};

export function MakeToken(t: TokenType, v?: string): Token {
  const typ: TokenType = t;
  const val: string | undefined = v;
  return {
    is: (t: TokenType, v?: string) =>
      t === typ && (isUndefined(v) || v === val),
    isIdentifier: (v?: string | string[]) => {
      if (typ !== TokenType.Identifier) {
        return false;
      } else if (isUndefined(v)) {
        return true;
      } else if (isString(v)) {
        return v === val;
      } else {
        return !isUndefined(val) && v.includes(val);
      }
    },
    isOpenParen: () => typ === TokenType.Paren && val === '(',
    isCloseParen: () => typ === TokenType.Paren && val === ')',
    isComment: () =>
      typ === TokenType.Comment ||
      typ === TokenType.TailComment ||
      typ === TokenType.Directive,
    toString: () => `Token(${typ}${isUndefined(val) ? '' : `, ${val}`})`,
    type: () => typ,
    value: () => val,
  };
}

export function MakeParen(value: '(' | ')'): Token {
  return MakeToken(TokenType.Paren, value);
}

export function MakeQuoted(value: string): Token {
  return MakeToken(TokenType.Quoted, value);
}

export function MakeBracket(value: string, qty: number): Token {
  return MakeToken(TokenType.Bracketed, value);
}

export function MakeVariable(value: string): Token {
  return MakeToken(TokenType.Variable, value);
}

export function MakeIdentifier(value: string): Token {
  return MakeToken(TokenType.Identifier, value);
}

export function MakeDirective(value: Directives): Token {
  return MakeToken(TokenType.Directive, value);
}

export function MakeInlineComment(value: string): Token {
  return MakeToken(TokenType.TailComment, value);
}

export function MakeComment(value: string): Token {
  return MakeToken(TokenType.Comment, value);
}

export function MakeEOF(): Token {
  return MakeToken(TokenType.EOF, '');
}

export function MakeTokenStream(input: string): TokenStream {
  const tokens: Token[] = [];
  let curPos = 0;

  function history(num: number): Token[] {
    return tokens.slice(Math.max(0, curPos - num), curPos);
  }

  function peek(): Token {
    if (tokens.length <= curPos) {
      throw new Error('No tokens available');
    } else {
      return tokens[curPos]!;
    }
  }

  function consume(): Token {
    return tokens[curPos++]!;
  }

  function expect(type: TokenType, value?: string): Token {
    const token = consume();
    if (token.is(type, value)) {
      return token;
    }
    throw new Error(
      `Expected\n\tToken(${type}${value ? `, ${value}` : ''})\ngot\n\t${token}`,
    );
  }

  function expectIdentifier(): string {
    return expect(TokenType.Identifier).value()!;
  }

  function tokenize(input: string): Token[] {
    const lines = input.split(/\r?\n/);
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber]!;
      const commentIndex = line.indexOf('#');
      const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      // Handle stand-alone
      if (codePart.trim().length === 0 && commentIndex >= 0) {
        const comment = line.slice(commentIndex).trim();
        if (comment.includes('@format-on')) {
          tokens.push(MakeDirective('@format-on'));
        } else if (comment.includes('@format-off')) {
          tokens.push(MakeDirective('@format-off'));
        } else {
          tokens.push(MakeComment(comment));
        }
        continue;
      }
      const commentPart =
        commentIndex >= 0 ? line.slice(commentIndex).trim() : null;

      let i = 0;
      while (i < codePart.length) {
        const c = codePart[i]!;
        if (/\s/.test(c)) {
          i++;
        } else if (c === '(' || c === ')') {
          tokens.push(MakeParen(c));
          i++;
        } else if (c === '"') {
          let j = i + 1;
          while (j < codePart.length && codePart[j] !== '"') {
            j++;
          }
          tokens.push(MakeQuoted(codePart.slice(i + 1, j)));
          i = j + 1;
        } else if (c === '$' && codePart[i + 1] === '{') {
          let j = i + 2;
          while (j < codePart.length && codePart[j] !== '}') {
            j++;
          }
          tokens.push(MakeVariable(codePart.slice(i + 2, j)));
          i = j + 1;
        } else {
          let j = i;
          while (j < codePart.length && /[^\s()"$]/.test(codePart[j]!)) {
            j++;
          }
          tokens.push(MakeIdentifier(codePart.slice(i, j)));
          i = j;
        }
      }

      if (commentPart) {
        if (commentPart.includes('@format-on')) {
          tokens.push(MakeDirective('@format-on'));
        } else if (commentPart.includes('@format-off')) {
          tokens.push(MakeDirective('@format-off'));
        } else {
          tokens.push(MakeInlineComment(commentPart));
        }
      }
    }

    tokens.push(MakeEOF());
    return tokens;
  }

  tokenize(input);
  return {
    peek,
    consume,
    expect,
    expectIdentifier,
    expectOpen: () => expect(TokenType.Paren, '(').isOpenParen(),
    expectClose: () => expect(TokenType.Paren, ')').isCloseParen(),
    history,
    count: () => tokens.length,
  };
}
