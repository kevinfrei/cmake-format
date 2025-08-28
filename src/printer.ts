import { isUndefined } from '@freik/typechk';
import { type Configuration, defaultCfg, getEOL } from './config';
import type {
  ArgList,
  Argument,
  CMakeFile,
  CommandInvocation,
  ConditionalBlock,
  PairedCall,
  Statement,
} from './parser';
import { ASTNode } from './parser';

function PrintAST(ast: CMakeFile, config: Partial<Configuration>) {
  const lines: string[] = [];
  let level: number = 0;
  const cfg = { ...defaultCfg, ...config };

  let indentSpace = cfg.useTabs ? '\t' : ' '.repeat(cfg.tabWidth);

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
    return cfg.printWidth - cfg.tabWidth * level;
  }

  function maybeTail(comment?: string, eol: boolean = false): string {
    if (!comment) return '';
    return eol ? ` #${comment}${getEOL}` : ` #${comment}`;
  }

  function formatArg(arg: Argument): string {
    switch (arg.type) {
      case ASTNode.BlockComment:
        return `\n${arg.value}\n`; // TODO: Indent
      case ASTNode.QuotedString:
        return `"${arg.value}"`;
      case ASTNode.UnquotedString:
        return arg.value;
      /*
      case ParserTokenType.VariableReference:
        return `\${${arg.name}}`;
        */
      case ASTNode.Group:
        return `${formatArgList(arg.value)}`;
      case ASTNode.Bracketed:
        const eq = '='.repeat(arg.equals);
        return `[${eq}[${arg.value}]${eq}]`;
      default:
        throw new Error(`Unknown argument type: ${arg.type}`);
    }
  }

  // Determines if an arg list *can* be on a single line
  function singleLineLen(argList: ArgList): number {
    // If there's a prefix tail comment, we can't single line it
    // command (# this is a comment
    //          ^ we can't put this on the same line as the closing parenthesis
    if (argList.prefixTailComment) {
      return -1;
    }
    // If any argument is a block comment, has a tail comment, or is a grouped argument
    // that itself cannot be single-lined, we can't single line the entire list.
    let len = 1; // Account for the opening parenthesis
    for (const arg of argList.args) {
      if (arg.type === ASTNode.BlockComment) {
        return -1;
      }
      if (arg.tailComment && arg.tailComment.length > 0) {
        return -1;
      }
      if (arg.type === ASTNode.Group) {
        const groupLen = singleLineLen(arg.value);
        if (groupLen < 0) {
          return -1;
        }
        len += groupLen;
      } else {
        len += formatArg(arg).length;
      }
      len++; // Accounts for either the space, or closing parenthesis
    }
    return len === 1 ? 2 : len; // Handle '()' specially...
  }

  function formatArgList(argList?: ArgList): string {
    let res = '';
    let first = true;
    if (!isUndefined(argList)) {
      for (const arg of argList.args) {
        if (!first) {
          res += ' ';
        } else {
          res += maybeTail(argList.prefixTailComment, true);
          first = false;
        }
        res += formatArg(arg);
        if (arg.type !== ASTNode.BlockComment && arg.tailComment) {
          res += maybeTail(arg.tailComment, true);
        }
      }
    }
    return `(${res})`;
  }

  // TODO: Handle grouped arg that needs splitting
  function formatArgLine(arg: Argument): void {
    lines.push(
      indent(
        formatArg(arg) +
          (arg.type === ASTNode.BlockComment ? '' : maybeTail(arg.tailComment)),
      ),
    );
  }

  function formatArgListLines(argList?: ArgList): void {
    if (!argList) return;
    argList.args.forEach(formatArgLine);
  }

  // Returns the *last* line of the code being formatted
  function formatInvoke(prefix: string, argList?: ArgList): string {
    const single = singleLineLen(argList || { args: [] });
    if (single > 0 && availableWidth() >= single + prefix.length) {
      return (prefix !== '' ? indent(prefix) : '') + formatArgList(argList);
    }
    // It's on multiple lines.
    lines.push(indent(prefix + '(' + maybeTail(argList?.prefixTailComment)));
    level++;
    formatArgListLines(argList);
    level--;
    return ')';
  }

  function printCommandInvocation(cmd: CommandInvocation): void {
    const line = formatInvoke(cmd.name, cmd.args);
    lines.push(line + maybeTail(cmd.tailComment));
  }

  function printConditionalBlock(cond: ConditionalBlock): void {
    lines.push(
      formatInvoke('if', cond.condition) + maybeTail(cond.ifTailComment),
    );
    level++;
    cond.body.map(printStatement);
    level--;
    for (const elseif of cond.elseifBlocks) {
      lines.push(
        formatInvoke('elseif', elseif.condition) +
          maybeTail(elseif.tailComment),
      );
      level++;
      elseif.body.map(printStatement);
      level--;
    }

    if (cond.elseBlock) {
      lines.push(
        formatInvoke('else', cond.elseBlock?.elseArgs) +
          maybeTail(cond.elseBlock.tailComment),
      );
      level++;
      cond.elseBlock.body.map(printStatement);
      level--;
    }

    lines.push(
      formatInvoke('endif', cond.endifArgs) + maybeTail(cond.endifTailComment),
    );
  }

  function printPairedCall(call: PairedCall): void {
    lines.push(
      formatInvoke(call.open, call.params) + maybeTail(call.startTailComment),
    );
    level++;
    call.body.map(printStatement);
    level--;
    lines.push(
      formatInvoke(call.close, call.endArgs) + maybeTail(call.endTailComment),
    );
  }

  function printStatement(stmt: Statement): void {
    switch (stmt.type) {
      case ASTNode.CommandInvocation:
        printCommandInvocation(stmt);
        break;
      case ASTNode.ConditionalBlock:
        printConditionalBlock(stmt);
        break;
      case ASTNode.PairedCall:
        printPairedCall(stmt);
        break;
      case ASTNode.BlockComment:
        if (!stmt.isBlank) {
          lines.push(...indent(stmt.value.split('\n')));
        } else {
          lines.push('');
        }
        break;
      case ASTNode.Directive:
        lines.push(indent(`# ${stmt.value}`));
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
  const eol = getEOL(config);
  const printed = PrintAST(ast, config).join(eol);
  // If it's an empty file, leave it alone,
  // but we always end with a new line...
  if (printed.trim().length === 0) {
    return '';
  }
  return printed.endsWith(eol) ? printed : printed + eol;
}
