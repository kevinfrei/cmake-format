// Tokenizer types

export type Parens = '(' | ')';

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
export type Token = {
  type: () => TokenType;
  value: () => string;
  pos: () => TxtPos;
};
*/

export type TxtPos = {
  line: number;
  col: number;
};

export type Position = {}; // { pos: TxtPos };

export type Identifier = {
  type: TokenType.Identifier;
  value: string;
} & Position;

export type Quoted = {
  type: TokenType.Quoted;
  value: string;
} & Position;

export type Variable = {
  type: TokenType.Variable;
  value: string;
} & Position;

export type Paren = {
  type: TokenType.Paren;
  value: '(' | ')';
} & Position;

export type Comment = {
  type: TokenType.Comment;
  value: string;
} & Position;

export type InlineComment = {
  type: TokenType.TailComment;
  value: string;
} & Position;

export type Directive = {
  type: TokenType.Directive;
  value: '@skip-format' | string;
} & Position;

export type EOF = {
  type: TokenType.EOF;
  value: '';
} & Position;

export type Token =
  | Identifier
  | Quoted
  | Variable
  | Paren
  | Comment
  | InlineComment
  | Directive
  | EOF;

export type TokenStream = {
  peek: () => Token;
  consume: () => Token;
  expect: (type: TokenType, value?: string) => Token;
  expectIdentifier: () => string;
  expectParen: (val: Parens) => void;
  count: () => number;
  history: (num: number) => Token[];
};

/*
export function mkTxtPos(line: number, col: number): TxtPos {
  return { line, col };
}
*/

export function mkParen(value: Parens): Paren {
  return { type: TokenType.Paren, value };
}

export function mkQuoted(value: string): Quoted {
  return { type: TokenType.Quoted, value };
}

export function mkVariable(value: string): Variable {
  return { type: TokenType.Variable, value };
}

export function mkIdentifier(value: string): Identifier {
  return { type: TokenType.Identifier, value };
}

export function mkDirective(value: string): Directive {
  return { type: TokenType.Directive, value };
}

export function mkInlineComment(value: string): InlineComment {
  return { type: TokenType.TailComment, value };
}

export function mkComment(value: string): Comment {
  return { type: TokenType.Comment, value };
}

export function mkEOF(): EOF {
  return { type: TokenType.EOF, value: '' };
}

export function isAnyComment(token: Token): token is Comment {
  return (
    token.type === TokenType.Comment ||
    token.type === TokenType.TailComment ||
    token.type === TokenType.Directive
  );
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
    if (token.type !== type || (value && token.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}'`,
      );
    }
    return token;
  }

  function expectIdentifier(): string {
    return expect(TokenType.Identifier).value;
  }

  function expectParen(val: Parens): void {
    expect(TokenType.Paren, val);
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
          tokens.push(mkDirective('@format-on'));
        } else if (comment.includes('@format-off')) {
          tokens.push(mkDirective('@format-off'));
        } else {
          tokens.push(mkComment(comment));
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
          tokens.push(mkParen(c));
          i++;
        } else if (c === '"') {
          let j = i + 1;
          while (j < codePart.length && codePart[j] !== '"') {
            j++;
          }
          tokens.push(mkQuoted(codePart.slice(i + 1, j)));
          i = j + 1;
        } else if (c === '$' && codePart[i + 1] === '{') {
          let j = i + 2;
          while (j < codePart.length && codePart[j] !== '}') {
            j++;
          }
          tokens.push(mkVariable(codePart.slice(i + 2, j)));
          i = j + 1;
        } else {
          let j = i;
          while (j < codePart.length && /[^\s()"$]/.test(codePart[j]!)) {
            j++;
          }
          tokens.push(mkIdentifier(codePart.slice(i, j)));
          i = j;
        }
      }

      if (commentPart) {
        if (commentPart.includes('@format-on')) {
          tokens.push(mkDirective('@format-on'));
        } else if (commentPart.includes('@format-off')) {
          tokens.push(mkDirective('@format-off'));
        } else {
          tokens.push(mkInlineComment(commentPart));
        }
      }
    }

    tokens.push(mkEOF());
    return tokens;
  }
  tokenize(input);
  return {
    peek,
    consume,
    expect,
    expectIdentifier,
    expectParen,
    history,
    count: () => tokens.length,
  };
}
