// Tokenizer types

import { isString, isUndefined } from '@freik/typechk';

// This should be faster, but the strings make it more debuggable
export enum NumberedTokenType {
  Identifier, // = 'identifier',
  Quoted, // = 'quoted',
  Bracketed, // = 'bracketed',
  Variable, // = 'variable',
  Paren, // = 'paren',
  Curly, // = 'curly',
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
  Curly = 'curly',
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
  readonly type: TokenType;
  readonly value: string | undefined;
  is: (type: TokenType, val?: string) => boolean;
  isOpenParen: () => boolean;
  isCloseParen: () => boolean;
  /*
    isOpenCurly: () => boolean;
    isCloseCurly: () => boolean;
  */
  isComment: () => boolean;
  isIdentifier: (val?: string | string[]) => boolean;
  toString: () => string;
};

export type TokenStream = {
  readonly tokens: Token[];
  peek: () => Token;
  consume: () => Token;
  count: () => number;
  history: (num: number) => Token[];
  expect: (type: TokenType, value?: string) => Token;
  expectIdentifier: (val?: string) => string;
  expectOpenParen: () => boolean;
  expectCloseParen: () => boolean;
  /*
    expectOpenCurly: () => boolean;
    expectCloseCurly: () => boolean;
  */
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
  const type: TokenType = t;
  const value: string | undefined = v;
  return {
    type,
    value,
    is: (t: TokenType, v?: string) =>
      t === type && (isUndefined(v) || v === value),
    isIdentifier: (v?: string | string[]) => {
      if (type !== TokenType.Identifier) {
        return false;
      } else if (isUndefined(v)) {
        return true;
      } else if (isString(v)) {
        return v === value;
      } else {
        return !isUndefined(value) && v.includes(value);
      }
    },
    isOpenParen: () => type === TokenType.Paren && value === '(',
    isCloseParen: () => type === TokenType.Paren && value === ')',
    /*
        isOpenCurly: () => type === TokenType.Curly && value === '{',
        isCloseCurly: () => type === TokenType.Curly && value === '}',
    */
    isComment: () =>
      type === TokenType.Comment ||
      type === TokenType.TailComment ||
      type === TokenType.Directive,
    toString: () => `Token(${type}${isUndefined(value) ? '' : `, ${value}`})`,
  };
}

export function MakeParen(value: '(' | ')'): Token {
  return MakeToken(TokenType.Paren, value);
}

/*
export function MakeCurly(value: '{' | '}'): Token {
  return MakeToken(TokenType.Curly, value);
}
*/

export function MakeQuoted(value: string): Token {
  return MakeToken(TokenType.Quoted, value);
}

export function MakeBracket(value: string, qty: number): Token {
  return MakeToken(TokenType.Bracketed, `${qty}:${value}`);
}

export function MakeVariable(value: string): Token {
  return MakeToken(TokenType.Variable, value);
}

export function MakeIdentifier(value: string): Token {
  return MakeToken(TokenType.Identifier, value);
}

export function MakeDirective(value: string): Token {
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
  const posMap: { line: number; column: number }[] = [];
  let curPos = 0;
  let lineNumber = 0;
  let linePos = 0;

  function pushToken(token: Token) {
    tokens.push(token);
    posMap.push({ line: lineNumber, column: linePos });
  }

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
      `Expected\n\tToken(${type}${value ? `, ${value}` : ''})\ngot\n\t${token} at line ${posMap[curPos - 1]?.line}, column ${posMap[curPos - 1]?.column}`,
    );
  }

  function expectIdentifier(val?: string): string {
    const token = isUndefined(val)
      ? expect(TokenType.Identifier)
      : expect(TokenType.Identifier, val);
    return token.value!;
  }

  function MaybePush(curToken: string): string {
    if (curToken.length > 0) {
      pushToken(MakeIdentifier(curToken));
    }
    return '';
  }

  // Match the pattern ' ]*=*]'
  function equalBracket(
    line: string,
    linePos: number,
    bracket: string,
    skipSpace: boolean = false,
  ): [number, number] {
    let count = 0;
    while (
      skipSpace &&
      linePos < line.length &&
      (line[linePos] === ' ' || line[linePos] === '\t')
    ) {
      linePos++;
    }
    if (linePos >= line.length || line[linePos] !== bracket) {
      return [-1, -1];
    }
    linePos++;
    while (linePos < line.length && line[linePos] === '=') {
      count++;
      linePos++;
    }
    if (linePos < line.length && line[linePos] === bracket) {
      return [count, linePos];
    }
    return [-1, -1];
  }

  function StartComment(line: string, linePos: number): TokenResult {
    // Check to see if this comment is just through the end of the line, or if it starts a bracket-comment
    const [equalCount, newPos] = equalBracket(line, linePos + 1, '[', true);
    if (equalCount === -1) {
      const isInline = line.substring(0, linePos).trim().length !== 0;
      const comment = line.substring(linePos);
      if (isInline) {
        pushToken(MakeInlineComment(comment));
      } else {
        const trimmed = comment.substring(1).trim();
        if (
          trimmed.startsWith('@format-on') ||
          trimmed.startsWith('@format-off')
        ) {
          pushToken(MakeDirective(trimmed));
        } else {
          pushToken(MakeComment(comment));
        }
      }
      return { state: TokenStateClear, linePos: line.length, curTok: '' };
    }
    // If it was a bracket comment, we'll just register that we're in that state, and keep slurping
    return {
      state: TokenStateBComment(equalCount),
      linePos: newPos,
      curTok: line.substring(linePos, newPos + 1),
    };
  }

  function CheckBracketArg(
    line: string,
    linePos: number,
    curTok: string,
  ): TokenResult {
    const [equalCount, newPos] = equalBracket(line, linePos, '[', false);
    if (equalCount === -1) {
      // If no match, this doesn't fit the grammar properly
      // TODO: There's apparently a crime against humanity lurking here,
      // where CMake has a custom regex syntax.. Go look at LLVM/llvm/lib/ObjCopyCMakeLists.txt
      // and figure out how to handle it.
      return {
        state: TokenStateClear,
        linePos,
        curTok: curTok + line[linePos],
      };
    }
    return {
      state: TokenStateBArg(equalCount),
      linePos: newPos,
      curTok: '',
    };
  }

  function CheckEndBracket(
    curState: BracketArgState | BracketCommentState,
    line: string,
    linePos: number,
    curTok: string,
  ): TokenResult {
    const [equalCount, newPos] = equalBracket(line, linePos, ']', false);
    if (equalCount === curState.equals) {
      // We've closed the bracketed argument/comment
      if (curState.state === LineState.BracketComment) {
        pushToken(MakeComment(curTok + line.substring(linePos, newPos + 1)));
      } /* if (curState.state === LineState.BracketArg) */ else {
        pushToken(
          MakeBracket(
            curTok + line.substring(linePos, newPos - 1 - equalCount),
            curState.equals,
          ),
        );
      }
      return {
        state: TokenStateClear,
        linePos: newPos,
        curTok: '',
      };
    }
    // If no match, this doesn't fit the grammar properly, keep accumulating characters
    return {
      state: curState,
      linePos,
      curTok: curTok + ']',
    };
  }

  function tokenize(input: string): Token[] {
    const lines = input.split(/\r?\n/);
    let state: TokenState = TokenStateClear;
    let curTok = '';
    for (lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber]!;
      for (linePos = 0; linePos < line.length; linePos++) {
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
                curTok = '';
                continue;
              case '[':
                curTok = MaybePush(curTok);
                ({ state, linePos, curTok } = CheckBracketArg(
                  line,
                  linePos,
                  curTok,
                ));
                continue;
              case '(':
              case ')':
                curTok = MaybePush(curTok);
                pushToken(MakeParen(line[linePos] as '(' | ')'));
                continue;
              case '\\':
                curTok += '\\';
                if (linePos + 1 < line.length) {
                  curTok += line[linePos + 1];
                  linePos++;
                }
                continue;
              case ' ':
              case '\t':
                curTok = MaybePush(curTok);
                continue;
              default:
                curTok += line[linePos];
                continue;
            }
          case LineState.BracketArg:
          case LineState.BracketComment:
            if (linePos === 0) {
              curTok += '\n';
            }
            if (line[linePos] === ']') {
              ({ state, linePos, curTok } = CheckEndBracket(
                state,
                line,
                linePos,
                curTok,
              ));
            } else {
              curTok += line[linePos];
            }
            continue;
          case LineState.Quote:
            if (linePos === 0) {
              curTok += '\n';
            }
            if (line[linePos] === '"') {
              pushToken(MakeQuoted(curTok));
              curTok = '';
              state = TokenStateClear;
            } else if (line[linePos] === '\\') {
              curTok += '\\';
              if (linePos + 1 < line.length) {
                curTok += line[linePos + 1];
                linePos++;
              }
            } else {
              curTok += line[linePos];
            }
            continue;
        }
      }
    }
    pushToken(MakeEOF());
    return tokens;
  }

  tokenize(input);
  return {
    tokens,
    peek,
    consume,
    expect,
    expectIdentifier,
    expectOpenParen: () => expect(TokenType.Paren, '(').isOpenParen(),
    expectCloseParen: () => expect(TokenType.Paren, ')').isCloseParen(),
    history,
    count: () => tokens.length,
  };
}
