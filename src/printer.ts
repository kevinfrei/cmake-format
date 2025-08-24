import type {
  ArgList,
  Argument,
  CMakeFile,
  CommandInvocation,
  ConditionalBlock,
  PairedCall,
  Statement,
} from './parser';
import { ParserTokenType } from './parser';

export type Configuration = {
  useSpaces?: boolean;
  indentSize?: number;
  crlf?: boolean;
  lineWidth?: number;
  // NYI:
  reflowComments?: boolean;
  commands?: {
    [commandName: string]: {
      controlKeywords?: string[];
      options?: string[];
    };
  };
};

/*
Style preference:
****** THIS ONE ****** FALL BACK ****
*** set(file_list *** set(        ***
***   foo.cpp     ***   file_list ***
***   bar.cpp     ***   foo.cpp   ***
*** )             ***   bar.cpp   ***
***               *** )           ***
*************************************
*/
// TODO: Put this stuff into a configuration file
const defaultCfg: Configuration = {
  useSpaces: true,
  indentSize: 2,
  crlf: false,
  lineWidth: 80,
  reflowComments: false,
  /*
    Any other config stuff belongs in here.
    I feel like I should probably have the ability to use keywords
    in various commands to also affect indentation
    Something like this:
  */
  commands: {
    add_library: {
      // These maybe affect indentation?
      controlKeywords: [
        'STATIC',
        'SHARED',
        'MODULE',
        'OBJECT',
        'INTERFACE',
        'UNKNOWN',
        'ALIAS',
      ],
      // These just get capitalized
      options: ['GLOBAL', 'EXCLUDE_FROM_ALL', 'IMPORTED'],
    },
    add_executable: {
      options: [
        'WIN32',
        'MACOSX_BUNDLE',
        'EXCLUDE_FROM_ALL',
        'IMPORTED',
        'ALIAS',
      ],
    },
    target_sources: {
      controlKeywords: [
        'INTERFACE',
        'PUBLIC',
        'PRIVATE',
        'FILE_SET',
        'TYPE',
        'BASE_DIRS',
        'FILES',
      ],
      options: ['HEADERS', 'CXX_MODULES'],
    },
    target_compile_definitions: {
      controlKeywords: ['INTERFACE', 'PUBLIC', 'PRIVATE'],
    },
  },
};

let indentSpace = defaultCfg.useSpaces
  ? ' '.repeat(defaultCfg.indentSize || 2)
  : '\t';

export function getEOL(): string {
  return defaultCfg.crlf ? '\r\n' : '\n';
}

function indent(lines: string, level: number): string;
function indent(lines: string[], level: number): string[];
function indent(lines: string | string[], level: number): string | string[] {
  const pad = indentSpace.repeat(level);
  if (typeof lines === 'string') {
    return pad + lines;
  }
  return lines.map((line) => pad + line);
}

function formatArg(arg: Argument): string {
  switch (arg.type) {
    case ParserTokenType.BlockComment:
      return `\n${arg.value}\n`; // TODO: Indent
    case ParserTokenType.QuotedString:
      return `"${arg.value}"`;
    case ParserTokenType.UnquotedString:
      return arg.value;
    case ParserTokenType.VariableReference:
      return `\${${arg.name}}`;
    case ParserTokenType.Group:
      return `(${formatArgList(arg.value)})`;
    case ParserTokenType.Bracketed:
      const eq = '='.repeat(arg.equals);
      return `[${eq}[${arg.value}]${eq}]`;
  }
}

function formatArgList(argList?: ArgList): string {
  if (
    !argList ||
    (argList.args.length === 0 && argList.prefixTailComment === undefined)
  ) {
    return '';
  }
  let res = '';
  if (!argList.args) {
    return res;
  }
  let first = true;
  for (const arg of argList.args) {
    if (!first) {
      res += ' ';
    } else {
      if (argList.prefixTailComment) {
        res += ` #${argList.prefixTailComment}\n`;
      }
      first = false;
    }
    res += formatArg(arg);
    if (arg.type !== ParserTokenType.BlockComment && arg.tailComment) {
      res += ` #${arg.tailComment}\n`;
    }
  }
  return res;
}

function printCommandInvocation(
  cmd: CommandInvocation,
  level: number,
  lines: string[],
): void {
  const args = formatArgList(cmd.args);
  const line = indent(`${cmd.name}(${args})`, level);
  lines.push(cmd.tailComment ? `${line} ${cmd.tailComment}` : line);
}

function printConditionalBlock(
  cond: ConditionalBlock,
  level: number,
  lines: string[],
): void {
  lines.push(
    indent(
      `if(${formatArgList(cond.condition)}) ${cond.ifTailComment || ''}`,
      level,
    ),
  );
  cond.body.map((s) => printStatement(s, level + 1, lines));

  for (const elseif of cond.elseifBlocks) {
    lines.push(
      indent(
        `elseif(${formatArgList(elseif.condition)}) ${elseif.tailComment || ''}`,
        level,
      ),
    );
    elseif.body.map((s) => printStatement(s, level + 1, lines));
  }

  if (cond.elseBlock) {
    lines.push(
      indent(
        `else(${formatArgList(cond.elseBlock?.elseArgs ?? undefined)}) ${cond.elseBlock.tailComment || ''}`,
        level,
      ),
    );
    cond.elseBlock.body.map((s) => printStatement(s, level + 1, lines));
  }

  lines.push(
    indent(
      `endif(${formatArgList(cond.endifArgs)}) ${cond.endifTailComment || ''}`,
      level,
    ),
  );
}

function printPairedCall(
  call: PairedCall,
  level: number,
  lines: string[],
): void {
  lines.push(
    indent(
      `${call.open}(${formatArgList(call.params)}) ${call.startTailComment || ''}`,
      level,
    ),
  );
  call.body.map((s) => printStatement(s, level + 1, lines));
  lines.push(
    indent(
      `${call.close}(${formatArgList(call.endArgs)}) ${call.endTailComment || ''}`,
      level,
    ),
  );
}

function printStatement(stmt: Statement, level: number, lines: string[]): void {
  switch (stmt.type) {
    case ParserTokenType.CommandInvocation:
      printCommandInvocation(stmt, level, lines);
      break;
    case ParserTokenType.ConditionalBlock:
      printConditionalBlock(stmt, level, lines);
      break;
    case ParserTokenType.PairedCall:
      printPairedCall(stmt, level, lines);
      break;
    case ParserTokenType.BlockComment:
      lines.push(...indent(stmt.value.split('\n'), level));
      break;
    case ParserTokenType.Directive:
      lines.push(indent(stmt.value, level));
      break;
  }
}

export function printCMake(ast: CMakeFile): string[] {
  const lines: string[] = [];
  ast.statements.forEach((stmt) => printStatement(stmt, 0, lines));
  return lines;
}
