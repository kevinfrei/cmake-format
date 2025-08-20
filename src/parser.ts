import { isAnyComment, TokenType, type TokenStream } from './tokenizer';
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
} from './types';
import {
  mkCMakeFile,
  mkCommandInvocation,
  mkConditionalBlock,
  mkElseBlock,
  mkElseIfBlock,
  mkMacroDefinition,
  mkQuotedString,
  mkUnquotedString,
  mkVariableReference,
} from './types';

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
  tokens.expectParen('(');
  const args = parseArguments(tokens);
  tokens.expectParen(')');
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
  tokens.expectParen('(');
  const condition = parseArguments(tokens);
  tokens.expectParen(')');

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
        tokens.expectParen('(');
        tokens.expectParen(')');
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
  tokens.expectParen('(');
  const condition = parseArguments(tokens);
  tokens.expectParen(')');

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
  tokens.expectParen('(');
  tokens.expectParen(')');

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
  tokens.expectParen('(');
  const name = tokens.expectIdentifier();
  const params: string[] = [];

  while (tokens.peek().type === TokenType.Identifier) {
    params.push(tokens.expectIdentifier());
  }

  tokens.expectParen(')');

  const body: Statement[] = [];
  while (
    tokens.peek().type === TokenType.Identifier &&
    tokens.peek().value !== 'endmacro'
  ) {
    body.push(parseStatement(tokens, state));
  }

  tokens.expectIdentifier(); // "endmacro"
  tokens.expectParen('(');
  tokens.expectParen(')');

  return mkMacroDefinition(name, params, body);
}
