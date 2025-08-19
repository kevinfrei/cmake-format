import { consume, expectIdentifier, expectParen, peek } from './tokenizer';
import type {
  Argument,
  CMakeFile,
  CommandInvocation,
  ConditionalBlock,
  ElseBlock,
  ElseIfBlock,
  MacroDefinition,
  ParserState,
  Statement,
  Token,
} from './types';
import {
  isAnyComment,
  mkCMakeFile,
  mkCommandInvocation,
  mkComment,
  mkConditionalBlock,
  mkElseBlock,
  mkElseIfBlock,
  mkMacroDefinition,
  mkQuotedString,
  mkUnquotedString,
  mkVariableReference,
  TokenType,
} from './types';

export function parseCMakeFile(
  tokens: Token[],
  originalLines: string[],
): CMakeFile {
  const state: ParserState = { formatEnabled: true, originalLines };
  const statements: Statement[] = [];

  while (peek(tokens).type !== TokenType.EOF) {
    statements.push(parseStatement(tokens, state));
  }
  return mkCMakeFile(statements);
}

function collectLeadingComments(tokens: Token[], state: ParserState): string[] {
  const comments: string[] = [];
  while (isAnyComment(peek(tokens))) {
    const comment = consume(tokens).value;
    comments.push(comment);

    if (comment.includes('@format-off')) {
      state.formatEnabled = false;
    } else if (comment.includes('@format-on')) {
      state.formatEnabled = true;
    }
  }
  return comments;
}

function parseStatement(tokens: Token[], state: ParserState): Statement {
  const leadingComments = collectLeadingComments(tokens, state);
  const next = peek(tokens);
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
  if (peek(tokens).type === TokenType.InlineComment) {
    stmt.trailingComment = consume(tokens).value;
  }
  return { ...stmt, leadingComments };
}

function parseCommandInvocation(tokens: Token[]): CommandInvocation {
  const name = expectIdentifier(tokens);
  expectParen(tokens, '(');
  const args = parseArguments(tokens);
  expectParen(tokens, ')');
  return mkCommandInvocation(name, args);
}

function parseArguments(tokens: Token[]): Argument[] {
  const args: Argument[] = [];
  while (peek(tokens).type !== TokenType.Paren || peek(tokens).value !== ')') {
    args.push(parseArgument(tokens));
  }
  return args;
}

function parseArgument(tokens: Token[]): Argument {
  const token = consume(tokens);
  switch (token.type) {
    case TokenType.Quoted:
      return mkQuotedString(token.value);
    case TokenType.Identifier:
      return mkUnquotedString(token.value);
    case TokenType.Variable:
      return mkVariableReference(token.value);
    default:
      throw new Error(`Unexpected token in argument: ${token.type}`);
  }
}

function parseConditionalBlock(
  tokens: Token[],
  state: ParserState,
): ConditionalBlock {
  expectIdentifier(tokens); // "if"
  expectParen(tokens, '(');
  const condition = parseArguments(tokens);
  expectParen(tokens, ')');

  const body: Statement[] = [];
  const elseifBlocks: ElseIfBlock[] = [];
  let elseBlock: ElseBlock | undefined;

  while (true) {
    const leadingComments = collectLeadingComments(tokens, state);
    const next = peek(tokens);
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
        expectIdentifier(tokens); // "endif"
        expectParen(tokens, '(');
        expectParen(tokens, ')');
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

function parseElseIfBlock(tokens: Token[], state: ParserState): ElseIfBlock {
  expectIdentifier(tokens); // "elseif"
  expectParen(tokens, '(');
  const condition = parseArguments(tokens);
  expectParen(tokens, ')');

  const body: Statement[] = [];
  while (
    peek(tokens).type === TokenType.Identifier &&
    !['elseif', 'else', 'endif'].includes(peek(tokens).value)
  ) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseIfBlock(condition, body);
}

function parseElseBlock(tokens: Token[], state: ParserState): ElseBlock {
  expectIdentifier(tokens); // "else"
  expectParen(tokens, '(');
  expectParen(tokens, ')');

  const body: Statement[] = [];
  while (
    peek(tokens).type === TokenType.Identifier &&
    peek(tokens).value !== 'endif'
  ) {
    body.push(parseStatement(tokens, state));
  }

  return mkElseBlock(body);
}

function parseMacroDefinition(
  tokens: Token[],
  state: ParserState,
): MacroDefinition {
  expectIdentifier(tokens); // "macro"
  expectParen(tokens, '(');
  const name = expectIdentifier(tokens);
  const params: string[] = [];

  while (peek(tokens).type === TokenType.Identifier) {
    params.push(expectIdentifier(tokens));
  }

  expectParen(tokens, ')');

  const body: Statement[] = [];
  while (
    peek(tokens).type === TokenType.Identifier &&
    peek(tokens).value !== 'endmacro'
  ) {
    body.push(parseStatement(tokens, state));
  }

  expectIdentifier(tokens); // "endmacro"
  expectParen(tokens, '(');
  expectParen(tokens, ')');

  return mkMacroDefinition(name, params, body);
}
