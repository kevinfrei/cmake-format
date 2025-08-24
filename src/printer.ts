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
  let res = '';
  switch (arg.type) {
    case ParserTokenType.BlockComment:
      return `\n${arg.value}\n`; // TODO: Indent
    case ParserTokenType.QuotedString:
      res = `"${arg.value}"`;
      break;
    case ParserTokenType.UnquotedString:
      res = arg.value;
      break;
    case ParserTokenType.VariableReference:
      res = `\${${arg.name}}`;
      break;
    case ParserTokenType.Group:
      res = `(${arg.value.map(formatArg).join(' ')})`;
      break;
  }
  // TODO: Indent after the newline
  return arg.tailComment ? `${res} ${arg.tailComment}\n` : res;
}

function formatArgList(args?: Argument[]): string {
  let res = '';
  if (!args) {
    return res;
  }
  let first = true;
  for (const arg of args) {
    if (!first) {
      res += ' ';
    } else {
      first = false;
    }
    switch (arg.type) {
      case ParserTokenType.Group:
        if (arg.openTailComment) {
          res += `( #${arg.openTailComment}\n`;
        } else {
          res += '(';
        }
        res += `${formatArgList(arg.value)}`;
        if (arg.tailComment) {
          res += `) #${arg.tailComment}\n`;
        } else {
          res += ') ';
        }
        break;
      default:
        res += formatArg(arg);
    }
  }
  return res;
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
    lines.push(`${spacing}else(${formatArgList(cond.elseArgs)}) ${cond.elseBlock.tailComment || ''}`);
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
  lines.push(`${'  '.repeat(level)}endmacro(${mac.endMacroArgs?.join(' ') || ''}) ${mac.endTailComment || ''}`);
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
