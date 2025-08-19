// Tokenizer types

export enum TokenType {
  Identifier, // = 'identifier',
  Quoted, // = 'quoted',
  Variable, // = 'variable',
  Paren, // = 'paren',
  Comment, // = 'comment',
  InlineComment, // = 'inline_comment',
  Directive, // = 'directive',
  EOF, // = 'eof',
}

export type TxtPos = {
  line: number;
  col: number;
};

export type Position = { pos: TxtPos };

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
  type: TokenType.InlineComment;
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

// Parser types

export enum ParserTokenType {
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

export type QuotedString = {
  type: ParserTokenType.QuotedString;
  value: string;
} & Position;

export type UnquotedString = {
  type: ParserTokenType.UnquotedString;
  value: string;
} & Position;

export type VariableReference = {
  type: ParserTokenType.VariableReference;
  name: string;
} & Position;

export type Argument = QuotedString | UnquotedString | VariableReference;

export type Parens = '(' | ')';

type WithComments = {
  leadingComments?: string[];
  trailingComment?: string;
};

export type CommandInvocation = {
  type: ParserTokenType.CommandInvocation;
  name: string;
  args: Argument[];
} & WithComments &
  Position;

export type ConditionalBlock = {
  type: ParserTokenType.ConditionalBlock;
  condition: Argument[];
  body: Statement[];
  elseifBlocks: ElseIfBlock[];
  elseBlock?: ElseBlock;
} & WithComments &
  Position;

export type ElseIfBlock = {
  type: ParserTokenType.ElseIfBlock;
  condition: Argument[];
  body: Statement[];
} & WithComments &
  Position;

export type ElseBlock = {
  type: ParserTokenType.ElseBlock;
  body: Statement[];
} & WithComments &
  Position;

export type MacroDefinition = {
  type: ParserTokenType.MacroDefinition;
  name: string;
  params: string[];
  body: Statement[];
} & WithComments &
  Position;

export type Statement = CommandInvocation | ConditionalBlock | MacroDefinition;

export type CMakeFile = {
  type: ParserTokenType.CMakeFile;
  statements: Statement[];
};

export type ParserState = {
  formatEnabled: boolean;
  originalLines: string[];
};

export function mkTxtPos(line: number, col: number): TxtPos {
  return { line, col };
}

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
  return { type: TokenType.InlineComment, value };
}

export function mkComment(value: string): Comment {
  return { type: TokenType.Comment, value };
}

export function mkEOF(): EOF {
  return { type: TokenType.EOF, value: '' };
}

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

export function isAnyComment(token: Token): token is Comment {
  return token.type === TokenType.Comment || token.type === TokenType.InlineComment || token.type === TokenType.Directive;
}