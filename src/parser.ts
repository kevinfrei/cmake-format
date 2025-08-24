import { TokenType, type TokenStream } from './tokenizer';

export enum NumberedParserTokenType {
  QuotedString, // = 'QuotedString',
  UnquotedString, // = 'UnquotedString',
  VariableReference, // = 'VariableReference',
  CommandInvocation, // = 'CommandInvocation',
  ConditionalBlock, // = 'ConditionalBlock',
  ElseIfBlock, // = 'ElseIfBlock',
  ElseBlock, // = 'ElseBlock',
  Group, // = 'Group',
  PairedCall, // = 'PairedCall',
  Bracketed, // = 'Bracketed',
  BlockComment, // = 'BlockComment',
  Directive, // = 'Directive',
  CMakeFile, // = 'CMakeFile',
}

export enum ParserTokenType {
  QuotedString = 'QuotedString',
  UnquotedString = 'UnquotedString',
  VariableReference = 'VariableReference',
  CommandInvocation = 'CommandInvocation',
  ConditionalBlock = 'ConditionalBlock',
  ElseIfBlock = 'ElseIfBlock',
  ElseBlock = 'ElseBlock',
  Group = 'Group',
  PairedCall = 'PairedCall',
  Bracketed = 'Bracketed',
  BlockComment = 'BlockComment',
  Directive = 'Directive',
  CMakeFile = 'CMakeFile',
}

export type QuotedString = {
  type: ParserTokenType.QuotedString;
  value: string;
};

export type UnquotedString = {
  type: ParserTokenType.UnquotedString;
  value: string;
};

export type VariableReference = {
  type: ParserTokenType.VariableReference;
  name: string;
};

export type BracketedString = {
  type: ParserTokenType.Bracketed;
  value: string;
  equals: number;
};

export type GroupedArg = {
  type: ParserTokenType.Group;
  value: ArgList;
};

export type NonCommentArg = (
  | QuotedString
  | UnquotedString
  | VariableReference
  | BracketedString
  | GroupedArg
) & {
  tailComment?: string;
};

export type Argument = BlockComment | NonCommentArg;

export type ArgList = {
  args: Argument[];
  prefixTailComment?: string;
};

export type CommandInvocation = {
  type: ParserTokenType.CommandInvocation;
  name: string;
  args: ArgList;
  tailComment?: string;
};

export type ConditionalBlock = {
  type: ParserTokenType.ConditionalBlock;
  condition: ArgList;
  body: Statement[];
  elseifBlocks: ElseIfBlock[];
  elseBlock?: ElseBlock;
  endifArgs?: ArgList;
  ifTailComment?: string;
  endifTailComment?: string;
};

export type ElseIfBlock = {
  type: ParserTokenType.ElseIfBlock;
  condition: ArgList;
  body: Statement[];
  tailComment?: string;
};

export type ElseBlock = {
  type: ParserTokenType.ElseBlock;
  body: Statement[];
  elseArgs?: ArgList;
  tailComment?: string;
};

export type PairedCall = {
  type: ParserTokenType.PairedCall;
  open: string;
  close: string;
  params: ArgList;
  body: Statement[];
  endArgs?: ArgList;
  startTailComment?: string;
  endTailComment?: string;
};

export type BlockComment = {
  type: ParserTokenType.BlockComment;
  value: string;
};

export type Directive = {
  type: ParserTokenType.Directive;
  value: string;
};

export type Statement =
  | CommandInvocation
  | ConditionalBlock
  | PairedCall
  | BlockComment
  | Directive;

export type CMakeFile = {
  type: ParserTokenType.CMakeFile;
  statements: Statement[];
};

export type ParserState = {
  formatEnabled: boolean;
  originalLines: string[];
};

export function mkCMakeFile(statements: Statement[]): CMakeFile {
  return { type: ParserTokenType.CMakeFile, statements };
}

export function mkCommandInvocation(
  name: string,
  args: ArgList,
  tailComment?: string,
): CommandInvocation {
  return { type: ParserTokenType.CommandInvocation, name, args, tailComment };
}

export function mkQuotedString(value: string): QuotedString {
  return { type: ParserTokenType.QuotedString, value };
}

export function mkUnquotedString(value: string): UnquotedString {
  return { type: ParserTokenType.UnquotedString, value };
}

export function mkVariableReference(name: string): VariableReference {
  return { type: ParserTokenType.VariableReference, name };
}

export function mkBracketed(value: string): BracketedString {
  const countPos = value.indexOf(':');
  if (countPos < 1) {
    throw new Error(`Invalid bracketed string value: ${value}`);
  }
  const equals = parseInt(value.substring(0, countPos), 10);
  const bracketedValue = value.substring(countPos + 1);
  return { type: ParserTokenType.Bracketed, value: bracketedValue, equals };
}

export function mkGroupedArg(value: ArgList): GroupedArg {
  return { type: ParserTokenType.Group, value };
}

export function mkConditionalBlock(
  condition: ArgList,
  body: Statement[],
  elseifBlocks: ElseIfBlock[],
  elseBlock?: ElseBlock,
  endifArgs?: ArgList,
  ifTailComment?: string,
  endifTailComment?: string,
): ConditionalBlock {
  return {
    type: ParserTokenType.ConditionalBlock,
    condition,
    body,
    elseifBlocks,
    elseBlock,
    endifArgs,
    ifTailComment,
    endifTailComment,
  };
}

export function mkCommentBlock(value: string): BlockComment {
  return { type: ParserTokenType.BlockComment, value };
}

export function mkDirective(value: string): Directive {
  return { type: ParserTokenType.Directive, value };
}

export function mkElseIfBlock(
  condition: ArgList,
  body: Statement[],
  tailComment?: string,
): ElseIfBlock {
  return { type: ParserTokenType.ElseIfBlock, condition, body, tailComment };
}

export function mkElseBlock(
  body: Statement[],
  elseArgs?: ArgList,
  tailComment?: string,
): ElseBlock {
  return { type: ParserTokenType.ElseBlock, body, elseArgs, tailComment };
}

export function mkPairedCall(
  open: string,
  close: string,
  params: ArgList,
  body: Statement[],
  endArgs?: ArgList,
  startTailComment?: string,
  endTailComment?: string,
): PairedCall {
  return {
    type: ParserTokenType.PairedCall,
    open,
    close,
    params,
    body,
    endArgs,
    startTailComment,
    endTailComment,
  };
}

export function parseCMakeFile(
  tokens: TokenStream,
  originalLines: string[],
): CMakeFile {
  const state: ParserState = { formatEnabled: true, originalLines };
  const statements: Statement[] = [];

  while (!tokens.peek().is(TokenType.EOF)) {
    statements.push(parseStatement(tokens, state));
  }
  return mkCMakeFile(statements);
}

function parseStatement(tokens: TokenStream, state: ParserState): Statement {
  const next = tokens.peek();
  if (next.isIdentifier()) {
    switch (next.value) {
      case 'if':
        return parseConditionalBlock(tokens, state);
      case 'macro':
        return parsePairedCall(tokens, state, 'macro', 'endmacro');
      case 'block':
        return parsePairedCall(tokens, state, 'block', 'endblock');
      case 'function':
        return parsePairedCall(tokens, state, 'function', 'endfunction');
      case 'while':
        return parsePairedCall(tokens, state, 'while', 'endwhile');
      case 'foreach':
        return parsePairedCall(tokens, state, 'foreach', 'endforeach');
      default:
        return parseCommandInvocation(tokens);
    }
  } else if (next.is(TokenType.Comment)) {
    return mkCommentBlock(tokens.consume().value!);
  } else if (next.is(TokenType.Directive)) {
    return mkDirective(tokens.consume().value!);
  }
  throw new Error(`Expected statement or comment, got ${next}`);
}

function parseCommandInvocation(tokens: TokenStream): CommandInvocation {
  const name = tokens.expectIdentifier();
  const args = parseArguments(tokens);
  const tailComment = chkTail(tokens);
  return mkCommandInvocation(name, args, tailComment);
}

function parseArguments(tokens: TokenStream): ArgList {
  const args: Argument[] = [];
  tokens.expectOpenParen();
  const prefixTailComment = tokens.peek().is(TokenType.TailComment)
    ? tokens.consume().value!
    : undefined;

  while (!tokens.peek().isCloseParen()) {
    args.push(parseArgument(tokens));
  }
  tokens.expectCloseParen();
  return { args, prefixTailComment };
}

function maybeTailComment(
  tokens: TokenStream,
  arg: NonCommentArg,
): NonCommentArg {
  const next = tokens.peek();
  if (next.is(TokenType.TailComment)) {
    tokens.consume();
    return { ...arg, tailComment: next.value! };
  }
  return arg;
}

function parseGroupedArgs(tokens: TokenStream): GroupedArg {
  return mkGroupedArg(parseArguments(tokens));
}

function parseArgument(tokens: TokenStream): Argument {
  const token = tokens.peek();
  switch (token.type) {
    case TokenType.Quoted:
      tokens.consume();
      return maybeTailComment(tokens, mkQuotedString(token.value!));
    case TokenType.Identifier:
      tokens.consume();
      return maybeTailComment(tokens, mkUnquotedString(token.value!));
    case TokenType.Variable:
      tokens.consume();
      return maybeTailComment(tokens, mkVariableReference(token.value!));
    case TokenType.Comment:
      tokens.consume();
      return mkCommentBlock(token.value!);
    case TokenType.Paren:
      // Don't consume the token, as the group args parser will expect it
      return parseGroupedArgs(tokens);
    case TokenType.Bracketed:
      tokens.consume();
      return maybeTailComment(tokens, mkBracketed(token.value!));
  }
  const prev = tokens.history(10);
  const val = prev.map((t) => t.toString()).join(' * ');
  throw new Error(`Unexpected token in argument: ${token} -- ${val}`);
}

function chkTail(tokens: TokenStream): string | undefined {
  return tokens.peek().is(TokenType.TailComment)
    ? tokens.consume().value!
    : undefined;
}

function parseConditionalBlock(
  tokens: TokenStream,
  state: ParserState,
): ConditionalBlock {
  tokens.expectIdentifier('if');
  const condition = parseArguments(tokens);

  const ifTailComment = chkTail(tokens);

  const body: Statement[] = [];
  const elseifBlocks: ElseIfBlock[] = [];
  let elseBlock: ElseBlock | undefined;

  while (true) {
    const next = tokens.peek();
    if (next.isIdentifier()) {
      switch (next.value) {
        case 'elseif':
          elseifBlocks.push(parseElseIfBlock(tokens, state));
          continue;
        case 'else':
          elseBlock = parseElseBlock(tokens, state);
          continue;
        case 'endif':
          tokens.expectIdentifier('endif');
          const endifArgs = parseArguments(tokens);
          const endifTailComment = chkTail(tokens);
          return mkConditionalBlock(
            condition,
            body,
            elseifBlocks,
            elseBlock,
            endifArgs,
            ifTailComment,
            endifTailComment,
          );
      }
    } else if (!next.isComment()) {
      throw new Error(`Unexpected token in conditional block: ${next}`);
    }
    body.push(parseStatement(tokens, state));
  }
}

function parseElseIfBlock(
  tokens: TokenStream,
  state: ParserState,
): ElseIfBlock {
  tokens.expectIdentifier('elseif');
  const condition = parseArguments(tokens);
  const tailComment = chkTail(tokens);
  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier(['elseif', 'else', 'endif'])) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseIfBlock(condition, body, tailComment);
}

function parseElseBlock(tokens: TokenStream, state: ParserState): ElseBlock {
  tokens.expectIdentifier('else');
  const elseArgs = parseArguments(tokens);
  const tailComment = chkTail(tokens);

  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier('endif')) {
    body.push(parseStatement(tokens, state));
  }
  return mkElseBlock(body, elseArgs, tailComment);
}

function parsePairedCall(
  tokens: TokenStream,
  state: ParserState,
  open: string,
  close: string,
): PairedCall {
  tokens.expectIdentifier(open); // e.g., "macro"
  const params = parseArguments(tokens);
  const startTailComment = chkTail(tokens);

  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier(close)) {
    body.push(parseStatement(tokens, state));
  }

  tokens.expectIdentifier(close); // e.g., "endmacro"
  const endArgs: ArgList = parseArguments(tokens);
  const endTailComment = chkTail(tokens);

  return mkPairedCall(
    open,
    close,
    params,
    body,
    endArgs,
    startTailComment,
    endTailComment,
  );
}
