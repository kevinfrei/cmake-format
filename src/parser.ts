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
  MacroDefinition, // = 'MacroDefinition',
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
  MacroDefinition = 'MacroDefinition',
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

export type MacroDefinition = {
  type: ParserTokenType.MacroDefinition;
  name: string;
  params: string[];
  body: Statement[];
  endMacroArgs?: ArgList;
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
  | MacroDefinition
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

export function mkBracketed(
  value: string
): BracketedString {
  const countPos = value.indexOf(':');
  if (countPos < 1) {
    throw new Error(`Invalid bracketed string value: ${value}`);
  }
  const equals = parseInt(value.substring(0, countPos), 10);
  const bracketedValue = value.substring(countPos + 1);
  return { type: ParserTokenType.Bracketed, value: bracketedValue, equals };
}

export function mkGroupedArg(
  value: ArgList
): GroupedArg {
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

export function mkMacroDefinition(
  name: string,
  params: string[],
  body: Statement[],
  endMacroArgs?: ArgList,
  startTailComment?: string,
  endTailComment?: string,
): MacroDefinition {
  return {
    type: ParserTokenType.MacroDefinition,
    name,
    params,
    body,
    endMacroArgs,
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
        return parseMacroDefinition(tokens, state);
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
  tokens.expectOpenParen();
  const args = parseArguments(tokens);
  tokens.expectCloseParen();
  const tailComment = chkTail(tokens);
  return mkCommandInvocation(name, args, tailComment);
}

// Requires the opening paren has already been consumed.
// TODO: Maybe change that to only having been peeked?
function parseArguments(tokens: TokenStream): ArgList {
  const args: Argument[] = [];
  const prefixTailComment = tokens.peek().is(TokenType.TailComment)
    ? tokens.consume().value!
    : undefined;

  while (!tokens.peek().isCloseParen()) {
    args.push(parseArgument(tokens));
  }
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
  const value = parseArguments(tokens);
  tokens.expectCloseParen();
  return mkGroupedArg(value);
}

function parseArgument(tokens: TokenStream): Argument {
  const token = tokens.consume();
  switch (token.type) {
    case TokenType.Quoted:
      return maybeTailComment(tokens, mkQuotedString(token.value!));
    case TokenType.Identifier:
      return maybeTailComment(tokens, mkUnquotedString(token.value!));
    case TokenType.Variable:
      return maybeTailComment(tokens, mkVariableReference(token.value!));
    case TokenType.Comment:
      return mkCommentBlock(token.value!);
    case TokenType.TailComment:
      // Tail comment like this: "if ( # why can't we have nice things?"
    case TokenType.Paren:
      if (token.isOpenParen()) {
        return maybeTailComment(tokens, parseGroupedArgs(tokens));
      }
      break;
    case TokenType.Bracketed:
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
  tokens.expectIdentifier(); // "if"
  tokens.expectOpenParen();
  const condition = parseArguments(tokens);
  tokens.expectCloseParen();

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
          tokens.expectIdentifier(); // "endif"
          tokens.expectOpenParen();
          const endifArgs = parseArguments(tokens);
          tokens.expectCloseParen();
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
  tokens.expectIdentifier(); // "elseif"
  tokens.expectOpenParen();
  const condition = parseArguments(tokens);
  tokens.expectCloseParen();
  const tailComment = chkTail(tokens);
  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier(['elseif', 'else', 'endif'])) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseIfBlock(condition, body, tailComment);
}

function parseElseBlock(tokens: TokenStream, state: ParserState): ElseBlock {
  tokens.expectIdentifier(); // "else"
  tokens.expectOpenParen();
  const elseArgs = parseArguments(tokens);
  tokens.expectCloseParen();
  const tailComment = chkTail(tokens);

  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier('endif')) {
    body.push(parseStatement(tokens, state));
  }
  return mkElseBlock(body, elseArgs, tailComment);
}

function parseMacroDefinition(
  tokens: TokenStream,
  state: ParserState,
): MacroDefinition {
  tokens.expectIdentifier(); // "macro"
  tokens.expectOpenParen();
  const name = tokens.expectIdentifier();
  const params: string[] = [];

  while (tokens.peek().isIdentifier()) {
    params.push(tokens.expectIdentifier());
  }

  tokens.expectCloseParen();
  const startTailComment = chkTail(tokens);

  const body: Statement[] = [];
  while (!tokens.peek().isIdentifier('endmacro')) {
    body.push(parseStatement(tokens, state));
  }

  tokens.expectIdentifier(); // "endmacro"
  tokens.expectOpenParen();
  const endMacroParams: ArgList = parseArguments(tokens);
  tokens.expectCloseParen();
  const endTailComment = chkTail(tokens);

  return mkMacroDefinition(
    name,
    params,
    body,
    endMacroParams,
    startTailComment,
    endTailComment,
  );
}
