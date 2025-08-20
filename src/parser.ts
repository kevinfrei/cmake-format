import { isAnyComment, TokenType, type TokenStream } from './tokenizer';

export enum NumberedParserTokenType {
  QuotedString, // = 'QuotedString',
  UnquotedString, // = 'UnquotedString',
  VariableReference, // = 'VariableReference',
  CommandInvocation, // = 'CommandInvocation',
  ConditionalBlock, // = 'ConditionalBlock',
  ElseIfBlock, // = 'ElseIfBlock',
  ElseBlock, // = 'ElseBlock',
  MacroDefinition, // = 'MacroDefinition',
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
  MacroDefinition = 'MacroDefinition',
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

export type Argument = QuotedString | UnquotedString | VariableReference;

type WithComments = {
  leadingComments?: string[];
  trailingComment?: string;
};

export type CommandInvocation = {
  type: ParserTokenType.CommandInvocation;
  name: string;
  args: Argument[];
} & WithComments;

export type ConditionalBlock = {
  type: ParserTokenType.ConditionalBlock;
  condition: Argument[];
  body: Statement[];
  elseifBlocks: ElseIfBlock[];
  elseBlock?: ElseBlock;
} & WithComments;

export type ElseIfBlock = {
  type: ParserTokenType.ElseIfBlock;
  condition: Argument[];
  body: Statement[];
} & WithComments;

export type ElseBlock = {
  type: ParserTokenType.ElseBlock;
  body: Statement[];
} & WithComments;

export type MacroDefinition = {
  type: ParserTokenType.MacroDefinition;
  name: string;
  params: string[];
  body: Statement[];
} & WithComments;

export type Statement = CommandInvocation | ConditionalBlock | MacroDefinition;

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
  args: Argument[],
): CommandInvocation {
  return { type: ParserTokenType.CommandInvocation, name, args };
}

export function mkQuotedString(value: string): Argument {
  return { type: ParserTokenType.QuotedString, value };
}

export function mkUnquotedString(value: string): Argument {
  return { type: ParserTokenType.UnquotedString, value };
}

export function mkVariableReference(name: string): Argument {
  return { type: ParserTokenType.VariableReference, name };
}

export function mkConditionalBlock(
  condition: Argument[],
  body: Statement[],
  elseifBlocks: ElseIfBlock[],
  elseBlock?: ElseBlock,
): ConditionalBlock {
  return {
    type: ParserTokenType.ConditionalBlock,
    condition,
    body,
    elseifBlocks,
    elseBlock,
  };
}

export function mkElseIfBlock(
  condition: Argument[],
  body: Statement[],
): ElseIfBlock {
  return { type: ParserTokenType.ElseIfBlock, condition, body };
}

export function mkElseBlock(body: Statement[]): ElseBlock {
  return { type: ParserTokenType.ElseBlock, body };
}

export function mkMacroDefinition(
  name: string,
  params: string[],
  body: Statement[],
): MacroDefinition {
  return { type: ParserTokenType.MacroDefinition, name, params, body };
}

export function parseCMakeFile(
  tokens: TokenStream,
  originalLines: string[],
): CMakeFile {
  const state: ParserState = { formatEnabled: true, originalLines };
  const statements: Statement[] = [];

  while (tokens.peek().type !== TokenType.EOF) {
    statements.push(parseStatement(tokens, state));
  }
  return mkCMakeFile(statements);
}

function collectLeadingComments(
  tokens: TokenStream,
  state: ParserState,
): string[] {
  const comments: string[] = [];
  while (isAnyComment(tokens.peek())) {
    const comment = tokens.consume().value;
    comments.push(comment);

    if (comment.includes('@format-off')) {
      state.formatEnabled = false;
    } else if (comment.includes('@format-on')) {
      state.formatEnabled = true;
    }
  }
  return comments;
}

function parseStatement(tokens: TokenStream, state: ParserState): Statement {
  const leadingComments = collectLeadingComments(tokens, state);
  const next = tokens.peek();
  if (next.type !== TokenType.Identifier) {
    throw new Error(`Expected statement, got ${next.type} '${next.value}'`);
  }
  let stmt: Statement;
  switch (next.value) {
    case 'if':
      stmt = parseConditionalBlock(tokens, state);
      break;
    case 'macro':
      stmt = parseMacroDefinition(tokens, state);
      break;
    default:
      stmt = parseCommandInvocation(tokens);
      break;
  }
  if (tokens.peek().type === TokenType.TailComment) {
    stmt.trailingComment = tokens.consume().value;
  }
  return { ...stmt, leadingComments };
}

function parseCommandInvocation(tokens: TokenStream): CommandInvocation {
  const name = tokens.expectIdentifier();
  tokens.expectOpen();
  const args = parseArguments(tokens);
  tokens.expectClose();
  return mkCommandInvocation(name, args);
}

function parseArguments(tokens: TokenStream): Argument[] {
  const args: Argument[] = [];
  while (
    tokens.peek().type !== TokenType.Paren ||
    tokens.peek().value !== ')'
  ) {
    args.push(parseArgument(tokens));
  }
  return args;
}

function parseArgument(tokens: TokenStream): Argument {
  const token = tokens.consume();
  switch (token.type) {
    case TokenType.Quoted:
      return mkQuotedString(token.value);
    case TokenType.Identifier:
      return mkUnquotedString(token.value);
    case TokenType.Variable:
      return mkVariableReference(token.value);
    default:
      const prev = tokens.history(10);
      const val = prev.map((t) => `${t.value}(${t.type})`).join(' * ');
      throw new Error(`Unexpected token in argument: ${token.type} -- ${val}`);
  }
}

function parseConditionalBlock(
  tokens: TokenStream,
  state: ParserState,
): ConditionalBlock {
  tokens.expectIdentifier(); // "if"
  tokens.expectOpen();
  const condition = parseArguments(tokens);
  tokens.expectClose();

  const body: Statement[] = [];
  const elseifBlocks: ElseIfBlock[] = [];
  let elseBlock: ElseBlock | undefined;

  while (true) {
    const leadingComments = collectLeadingComments(tokens, state);
    const next = tokens.peek();
    if (next.type !== TokenType.Identifier) break;

    switch (next.value) {
      case 'elseif':
        elseifBlocks.push({
          ...parseElseIfBlock(tokens, state),
          leadingComments,
        });
        break;
      case 'else':
        elseBlock = { ...parseElseBlock(tokens, state), leadingComments };
        break;
      case 'endif':
        tokens.expectIdentifier(); // "endif"
        tokens.expectOpen();
        tokens.expectClose();
        return {
          ...mkConditionalBlock(condition, body, elseifBlocks, elseBlock),
          leadingComments,
        };
      default:
        body.push({ ...parseStatement(tokens, state), leadingComments });
    }
  }

  throw new Error('Missing endif()');
}

function parseElseIfBlock(
  tokens: TokenStream,
  state: ParserState,
): ElseIfBlock {
  tokens.expectIdentifier(); // "elseif"
  tokens.expectOpen();
  const condition = parseArguments(tokens);
  tokens.expectClose();

  const body: Statement[] = [];
  while (
    tokens.peek().type === TokenType.Identifier &&
    !['elseif', 'else', 'endif'].includes(tokens.peek().value)
  ) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseIfBlock(condition, body);
}

function parseElseBlock(tokens: TokenStream, state: ParserState): ElseBlock {
  tokens.expectIdentifier(); // "else"
  tokens.expectOpen();
  tokens.expectClose();

  const body: Statement[] = [];
  while (
    tokens.peek().type === TokenType.Identifier &&
    tokens.peek().value !== 'endif'
  ) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseBlock(body);
}

function parseMacroDefinition(
  tokens: TokenStream,
  state: ParserState,
): MacroDefinition {
  tokens.expectIdentifier(); // "macro"
  tokens.expectOpen();
  const name = tokens.expectIdentifier();
  const params: string[] = [];

  while (tokens.peek().type === TokenType.Identifier) {
    params.push(tokens.expectIdentifier());
  }

  tokens.expectClose();

  const body: Statement[] = [];
  while (
    tokens.peek().type === TokenType.Identifier &&
    tokens.peek().value !== 'endmacro'
  ) {
    body.push(parseStatement(tokens, state));
  }

  tokens.expectIdentifier(); // "endmacro"
  tokens.expectOpen();
  tokens.expectClose();

  return mkMacroDefinition(name, params, body);
}
