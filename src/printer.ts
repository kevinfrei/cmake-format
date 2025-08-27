import { isString } from '@freik/typechk';
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
  useSpaces: boolean;
  indentSize: number;
  crlf: boolean;
  printWidth: number;
  /*
    Any other config stuff belongs in here.
    I feel like I should probably have the ability to use keywords
    in various commands to also affect indentation
    Something like this:
  */
  reflowComments: boolean; // NYI
  commands: {
    [commandName: string]: {
      // These may affect indentation
      controlKeywords?: string[];
      // This indents after the specified number of arguments
      indent?: number;
      // These just get capitalized
      options?: string[];
    };
  };
  /*
   * This isn't yet fully formed in my head
   *
  sort: {
    // The number of args to skip before sorting the arguments
    [commandMatch: string]: { // command names
      match: string; // A string or regex to match arguments
      skip: number;  // Number of arguments to skip before sorting
    };
  };
   */
};

/*

Style guide:

*************************************
***   THIS ONE    ***  FALL-BACK  ***
*************************************
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
  crlf: false, // This one doesn't much matter for console.log output
  printWidth: 80,
  reflowComments: false,
  commands: {
    add_library: {
      controlKeywords: [
        'STATIC',
        'SHARED',
        'MODULE',
        'OBJECT',
        'INTERFACE',
        'UNKNOWN',
        'ALIAS',
      ],
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
    set: { indent: 1 },
  },
  /*
  sort: {
    set: { skip: 1 },
  },
  */
};

export function getEOL(config: Partial<Configuration>): string {
  return (config.crlf ?? defaultCfg.crlf) ? '\r\n' : '\n';
}

function PrintAST(ast: CMakeFile, config: Partial<Configuration>) {
  const lines: string[] = [];
  let level: number = 0;
  const cfg = { ...defaultCfg, ...config };

  let indentSpace = cfg.useSpaces ? ' '.repeat(cfg.indentSize) : '\t';

  function indent(lines: string): string;
  function indent(lines: string[]): string[];
  function indent(lines: string | string[]): string | string[] {
    const pad = indentSpace.repeat(level);
    if (typeof lines === 'string') {
      return pad + lines;
    }
    return lines.map((line) => pad + line);
  }

  function availableWidth(): number {
    return cfg.printWidth - cfg.indentSize * level;
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
        return `${formatArgList(arg.value)}`;
      case ParserTokenType.Bracketed:
        const eq = '='.repeat(arg.equals);
        return `[${eq}[${arg.value}]${eq}]`;
    }
  }

  // Nested arg list overload: No indentation
  function formatArgList(argList: ArgList): string;
  // Command invocation overload: This one indents
  function formatArgList(prefix: string, argList: ArgList): string;

  function formatArgList(
    prefixOrArgList: string | ArgList,
    orArgList?: ArgList,
  ): string {
    const prefix = isString(prefixOrArgList) ? prefixOrArgList : '';
    const argList: ArgList = isString(prefixOrArgList)
      ? (orArgList as ArgList)
      : prefixOrArgList;
    let res = '';
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
    return (prefix !== '' ? indent(prefix) : '') + `(${res})`;
  }

  function printCommandInvocation(cmd: CommandInvocation): void {
    const line = formatArgList(cmd.name, cmd.args);
    lines.push(cmd.tailComment ? `${line} ${cmd.tailComment}` : line);
  }

  function printConditionalBlock(cond: ConditionalBlock): void {
    lines.push(
      `${formatArgList('if', cond.condition)} ${cond.ifTailComment || ''}`,
    );
    level++;
    cond.body.map(printStatement);
    level--;
    for (const elseif of cond.elseifBlocks) {
      lines.push(
        `${formatArgList('elseif', elseif.condition)} ${elseif.tailComment || ''}`,
      );
      level++;
      elseif.body.map(printStatement);
      level--;
    }

    if (cond.elseBlock) {
      lines.push(
        `${formatArgList('else', cond.elseBlock?.elseArgs)} ${cond.elseBlock.tailComment || ''}`,
      );
      level++;
      cond.elseBlock.body.map(printStatement);
      level--;
    }

    lines.push(
      `${formatArgList('endif', cond.endifArgs)} ${cond.endifTailComment || ''}`,
    );
  }

  function printPairedCall(call: PairedCall): void {
    lines.push(
      `${formatArgList(call.open, call.params)} ${call.startTailComment || ''}`,
    );
    level++;
    call.body.map(printStatement);
    level--;
    lines.push(
      `${formatArgList(call.close, call.endArgs)} ${call.endTailComment || ''}`,
    );
  }

  function printStatement(stmt: Statement): void {
    switch (stmt.type) {
      case ParserTokenType.CommandInvocation:
        printCommandInvocation(stmt);
        break;
      case ParserTokenType.ConditionalBlock:
        printConditionalBlock(stmt);
        break;
      case ParserTokenType.PairedCall:
        printPairedCall(stmt);
        break;
      case ParserTokenType.BlockComment:
        lines.push(...indent(stmt.value.split('\n')));
        break;
      case ParserTokenType.Directive:
        lines.push(indent(stmt.value));
        break;
    }
  }

  ast.statements.forEach((stmt) => printStatement(stmt));
  return lines;
}

export function printCMake(
  ast: CMakeFile,
  config: Partial<Configuration> = {},
): string[] {
  return PrintAST(ast, config);
}

export function printCMakeToString(
  ast: CMakeFile,
  config: Partial<Configuration> = {},
): string {
  return PrintAST(ast, config).join(getEOL(config));
}
