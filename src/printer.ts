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
  printWidth?: number;
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
  crlf: false, // This one doesn't much matter for console.log output
  printWidth: 80,
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

export function getEOL(): string {
  return defaultCfg.crlf ? '\r\n' : '\n';
}

function PrintAST(ast: CMakeFile) {
  const lines: string[] = [];
  let level: number = 0;

  let indentSpace = defaultCfg.useSpaces
    ? ' '.repeat(defaultCfg.indentSize || 2)
    : '\t';

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
    return defaultCfg.printWidth! - (defaultCfg.indentSize || 2) * level;
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

  function printCommandInvocation(cmd: CommandInvocation): void {
    const args = formatArgList(cmd.args);
    const line = indent(`${cmd.name}(${args})`);
    lines.push(cmd.tailComment ? `${line} ${cmd.tailComment}` : line);
  }

  function printConditionalBlock(cond: ConditionalBlock): void {
    lines.push(
      indent(
        `if(${formatArgList(cond.condition)}) ${cond.ifTailComment || ''}`,
      ),
    );
    level++;
    cond.body.map(printStatement);
    level--;
    for (const elseif of cond.elseifBlocks) {
      lines.push(
        indent(
          `elseif(${formatArgList(elseif.condition)}) ${elseif.tailComment || ''}`,
        ),
      );
      level++;
      elseif.body.map(printStatement);
      level--;
    }

    if (cond.elseBlock) {
      lines.push(
        indent(
          `else(${formatArgList(cond.elseBlock?.elseArgs ?? undefined)}) ${cond.elseBlock.tailComment || ''}`,
        ),
      );
      level++;
      cond.elseBlock.body.map(printStatement);
      level--;
    }

    lines.push(
      indent(
        `endif(${formatArgList(cond.endifArgs)}) ${cond.endifTailComment || ''}`,
      ),
    );
  }

  function printPairedCall(call: PairedCall): void {
    lines.push(
      indent(
        `${call.open}(${formatArgList(call.params)}) ${call.startTailComment || ''}`,
      ),
    );
    level++;
    call.body.map(printStatement);
    level--;
    lines.push(
      indent(
        `${call.close}(${formatArgList(call.endArgs)}) ${call.endTailComment || ''}`,
      ),
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
export function printCMake(ast: CMakeFile): string[] {
  return PrintAST(ast);
}
