import {
  ParserTokenType,
  type Argument,
  type CMakeFile,
  type CommandInvocation,
  type ConditionalBlock,
  type MacroDefinition,
  type Statement,
} from './parser';

function indent(lines: string[], level: number): string[] {
  const pad = '  '.repeat(level);
  return lines.map((line) => pad + line);
}

function formatArg(arg: Argument): string {
  switch (arg.type) {
    case ParserTokenType.QuotedString:
      return `"${arg.value}"`;
    case ParserTokenType.UnquotedString:
      return arg.value;
    case ParserTokenType.VariableReference:
      return `\${${arg.name}}`;
    case ParserTokenType.Group:
      return `(${arg.value.map(formatArg).join(' ')})`;
  }
}

function formatArgList(args?: Argument[]): string {
  return args?.map(formatArg).join(' ') || '';
}

function printCommandInvocation(
  cmd: CommandInvocation,
  level: number,
  lines: string[],
): void {
  const args = cmd.args.map(formatArg).join(' ');
  const line = `${'  '.repeat(level)}${cmd.name}(${args})`;
  lines.push(cmd.tailComment ? `${line} ${cmd.tailComment}` : line);
}

function printConditionalBlock(
  cond: ConditionalBlock,
  level: number,
  lines: string[],
): void {
  const spacing = '  '.repeat(level);
  lines.push(
    `${spacing}if(${formatArgList(cond.condition)}) ${cond.ifTailComment || ''}`,
  );
  cond.body.map((s) => printStatement(s, level + 1, lines));

  for (const elseif of cond.elseifBlocks) {
    lines.push(
      `${spacing}elseif(${formatArgList(elseif.condition)}) ${elseif.tailComment || ''}`,
    );
    elseif.body.map((s) => printStatement(s, level + 1, lines));
  }

  if (cond.elseBlock) {
    lines.push(`${spacing}else() ${cond.elseBlock.tailComment || ''}`);
    cond.elseBlock.body.map((s) => printStatement(s, level + 1, lines));
  }

  lines.push(
    `${spacing}endif(${formatArgList(cond.endifArgs)}) ${cond.endifTailComment || ''}`,
  );
}

function printMacroDefinition(
  mac: MacroDefinition,
  level: number,
  lines: string[],
): void {
  lines.push(
    `${'  '.repeat(level)}macro(${mac.name} ${mac.params.join(' ')}) ${mac.startTailComment || ''}`,
  );
  mac.body.map((s) => printStatement(s, level + 1, lines));
  lines.push(`${'  '.repeat(level)}endmacro() ${mac.endTailComment || ''}`);
}

function printStatement(stmt: Statement, level: number, lines: string[]): void {
  switch (stmt.type) {
    case ParserTokenType.CommandInvocation:
      printCommandInvocation(stmt, level, lines);
      break;
    case ParserTokenType.ConditionalBlock:
      printConditionalBlock(stmt, level, lines);
      break;
    case ParserTokenType.MacroDefinition:
      printMacroDefinition(stmt, level, lines);
      break;
    case ParserTokenType.BlockComment:
      lines.push(...indent(stmt.value.split('\n'), level));
      break;
    case ParserTokenType.Directive:
      lines.push(`${'  '.repeat(level)}${stmt.value}`);
      break;
  }
}

export function printCMake(ast: CMakeFile): string[] {
  const lines: string[] = [];
  ast.statements.forEach((stmt) => printStatement(stmt, 0, lines));
  return lines;
}
