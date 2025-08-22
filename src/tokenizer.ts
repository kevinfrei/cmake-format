// Tokenizer types

import { isString, isUndefined } from '@freik/typechk';
import { start } from 'repl';

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

const enum LineState {
  Clear,
  Quote,
  BracketArg,
  BracketComment,
}

type ClearState = {
  state: LineState.Clear;
};

type QuoteState = {
  state: LineState.Quote;
  backslashCount: number;
};

type BracketArgState = {
  state: LineState.BracketArg;
  equals: number;
};

type BracketCommentState = {
  state: LineState.BracketComment;
  equals: number;
};

const TokenStateClear: ClearState = {
  state: LineState.Clear,
};

const TokenStateQuote = (): QuoteState => ({
  state: LineState.Quote,
  backslashCount: 0,
});

const TokenStateBArg = (equals: number): BracketArgState => ({
  state: LineState.BracketArg,
  equals,
});

const TokenStateBComment = (equals: number): BracketCommentState => ({
  state: LineState.BracketComment,
  equals,
});

type TokenState =
  | ClearState
  | QuoteState
  | BracketArgState
  | BracketCommentState;

type TokenResult = { state: TokenState; linePos: number; curTok: string };

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

  function MaybePush(curToken: string): string {
    if (curToken.length > 0) {
      tokens.push(MakeIdentifier(curToken));
    }
    return '';
  }

  const bracketCommentRegex = /#\s*\[(?<equals>=*)\[/;
  function StartComment(line: string, linePos: number): TokenResult {
    // Check to see if this comment is just through the end of the line, or if it starts a bracket-comment

    const rest = line.substring(linePos);
    const bracketMatch = rest.match(bracketCommentRegex);
    if (bracketMatch === null) {
      const isInline = line.substring(0, linePos).trim().length !== 0;
      tokens.push(isInline ? MakeInlineComment(rest) : MakeComment(rest));
      return { state: TokenStateClear, linePos: line.length, curTok: '' };
    }
    // If it was a bracket comment, we'll just register that we're in that state, and keep slurping
    return {
      state: TokenStateBComment(bracketMatch.groups?.equals?.length || 0),
      linePos: linePos + bracketMatch[0].length,
      curTok: rest,
    };
  }

  const bracketArgRegex = /\[(?<equals>=*)\]/;
  function CheckBracketArg(line: string, linePos: number): TokenResult {
    const rest = line.substring(linePos);
    const match = rest.match(bracketArgRegex);
    if (match) {
      const equalsCount = match.groups?.equals?.length || 0;
      return {
        state: TokenStateBArg(equalsCount),
        linePos: linePos + match[0].length,
        curTok: rest,
      };
    }
    // If no match, this doesn't fit the grammar properly
    // TODO: There's apparently a crime against humanity lurking here,
    // where CMake has a custom regex syntax.. Go look at LLVM/llvm/lib/ObjCopyCMakeLists.txt
    // and figure out how to handle it.
    throw new Error(
      `Unrecognized bracket argument syntax at line ${linePos}: ${rest}`,
    );
  }

  function tokenize(input: string): Token[] {
    const lines = input.split(/\r?\n/);
    let state: TokenState = TokenStateClear;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber]!;
      let curTok = '';
      for (let linePos = 0; linePos < line.length; linePos++) {
        switch (state.state) {
          case LineState.Clear:
            // Normal tokenization state:
            switch (line[linePos]) {
              case '#':
                // Comments are kind of "out of line" because they're
                // pretty easy to tokenize, unless they're a bracket comment.
                curTok = MaybePush(curTok);
                ({ state, linePos, curTok } = StartComment(line, linePos));
                continue;
              case '"':
                curTok = MaybePush(curTok);
                state = TokenStateQuote();
                curTok += line[linePos];
                continue;
              case '[':
                curTok = MaybePush(curTok);
                ({ state, linePos, curTok } = CheckBracketArg(line, linePos));
                continue;
              case '(':
              case ')':
                curTok = MaybePush(curTok);
                tokens.push(MakeParen(line[linePos] as '(' | ')'));
                continue;
              case ' ':
              case '\t':
                curTok = MaybePush(curTok);
                continue;
              case '$':
                ({ state, linePos, curTok } = CheckVariable(line, linePos));
                continue;
              default:
                curTok += line[linePos];
                continue;
            }
            break;
          case LineState.BracketArg:
          case LineState.BracketComment:
          case LineState.Quote:
            // In these states, the entire line is considered part of the argument/comment/string
            tokens.push(MakeBracket(line, 2));
            state = TokenState.Clear;
            continue;
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
