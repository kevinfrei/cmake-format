import { isArray, isUndefined } from '@freik/typechk';
import {
  type CommandConfigSet,
  type Configuration,
  defaultCfg,
  emptyCmdConfigSet,
  getEOL,
  makeCommandConfigMap,
} from './config.js';
import type {
  ArgList,
  Argument,
  CMakeFile,
  CommandInvocation,
  ConditionalBlock,
  PairedCall,
  Statement,
} from './parser.js';
import { ASTNode } from './parser.js';

function PrintAST(ast: CMakeFile, config: Partial<Configuration>): string[] {
  const lines: string[] = [];
  let level: number = 0;
  const cfg = { ...defaultCfg, ...config };
  const cmdToConfig = makeCommandConfigMap(cfg.commands);

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

  // Tail comments include the '#'
  function maybeTail(comment?: string, eol: boolean = false): string {
    if (!comment) return '';
    return eol ? ` ${comment}${getEOL(config)}` : ` ${comment}`;
  }

  function formatArg(arg: Argument, cmdConfig: CommandConfigSet): string {
    switch (arg.type) {
      case ASTNode.BlockComment:
        return `${arg.value}`; // TODO: Indent
      case ASTNode.QuotedString:
        return `"${arg.value}"`;
      case ASTNode.UnquotedString:
        if (
          cmdConfig.options.has(arg.value.toUpperCase()) ||
          cmdConfig.controlKeywords.has(arg.value.toUpperCase())
        ) {
          return arg.value.toUpperCase();
        }
        return arg.value;
      /*
      case ParserTokenType.VariableReference:
        return `\${${arg.name}}`;
        */
      case ASTNode.Group:
        // Intentionaly drop the command config here, groups always use the default.
        return `(${formatArgList(arg.value)})`;
      case ASTNode.Bracketed:
        const eq = '='.repeat(arg.equals);
        return `[${eq}[${arg.value}]${eq}]`;
      default:
        throw new Error(`Unknown argument type: ${arg}`);
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
        // We don't bother with the command config here, since this is just a length check
        len += formatArg(arg, emptyCmdConfigSet).length;
      }
      len++; // Accounts for either the space, or closing parenthesis
    }
    return len === 1 ? 2 : len; // Handle '()' specially...
  }

  // Format an arg list on a single line
  function formatArgList(
    argList?: ArgList,
    cmdConfig: CommandConfigSet = emptyCmdConfigSet,
  ): string {
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
        res += formatArg(arg, cmdConfig);
        // This should just be an assert, as the types don't allow it.
        // if (arg.type !== ASTNode.BlockComment && arg.tailComment) {
        // This should never happen, because singleLineLen should have caught it
        // throw new Error(
        // 'Cannot format arg list on a single line due to tail comment',
        // );
        // }
      }
    }
    return res;
  }

  // Format an argument on it's own line
  function formatArgLine(
    arg: Argument,
    cmdConfig: CommandConfigSet = emptyCmdConfigSet,
  ): void {
    if (arg.type === ASTNode.Group) {
      lines.push(formatInvoke('', arg.value) + maybeTail(arg.tailComment));
    } else {
      lines.push(
        indent(
          formatArg(arg, cmdConfig) +
            (arg.type === ASTNode.BlockComment
              ? ''
              : maybeTail(arg.tailComment)),
        ),
      );
    }
  }

  // For an arg list that doesn't fit on one line:
  function formatArgListLines(
    argList?: ArgList,
    cmdConfig?: CommandConfigSet,
  ): void {
    if (!argList) return;
    let originallevel = level;
    const cmdCfg = cmdConfig ?? emptyCmdConfigSet;
    for (let i = 0; i < argList.args.length; i++) {
      const arg = argList.args[i]!;
      if (
        arg.type === ASTNode.UnquotedString &&
        cmdCfg.options.has(arg.value.toUpperCase())
      ) {
        arg.value = arg.value.toUpperCase();
      }
      formatArgLine(arg);
      // If we're after the indentAfter point, we need to increase the level
      if (i === cmdCfg.indentAfter) {
        level++;
      }
    }
    level = originallevel;
  }

  type ArgGroup = [string, Argument[], string | undefined];
  type ArgGroups = (Argument | ArgGroup)[];
  function isArgGroup(item: Argument | ArgGroup | undefined): item is ArgGroup {
    return (
      !isUndefined(item) &&
      isArray(item) &&
      item.length >= 2 &&
      item.length <= 3
    );
  }
  function groupArgsByControlKeyword(
    argList: ArgList,
    controlKeywords: Set<string>,
    options: Set<string>,
  ): ArgGroups {
    const argGroup: ArgGroups = [];
    function last(): ArgGroup | Argument | undefined {
      return argGroup[argGroup.length - 1];
    }
    for (const arg of argList.args) {
      if (arg.type === ASTNode.UnquotedString) {
        const argVal = arg.value.toUpperCase();
        if (controlKeywords.has(argVal)) {
          // We're starting a new group;
          argGroup.push([argVal, [], arg.tailComment]);
          continue;
        } else if (options.has(argVal)) {
          // Just found an option, so end the current group
          arg.value = argVal;
          argGroup.push(arg);
          continue;
        }
        // Fall through...
      }
      const lst = last();
      if (isArgGroup(lst)) {
        // We're in an arg group, add this guy...
        lst[1].push(arg);
      } else {
        // We're not in an arg group, just add it to the main group
        argGroup.push(arg);
      }
    }
    return argGroup;
  }

  // Returns the *last* line of the code being formatted
  function formatInvoke(prefix: string, argList?: ArgList): string {
    const cmdConfigPair = cmdToConfig.get(prefix);
    let realName = cmdConfigPair ? cmdConfigPair[0] : prefix;
    const cmdCfg = cmdConfigPair ? cmdConfigPair[1] : emptyCmdConfigSet;

    // Try to fit it all on one line.
    const single = singleLineLen(argList || { args: [] });
    if (single > 0 && availableWidth() >= single + prefix.length) {
      return indent(`${realName}(${formatArgList(argList, cmdCfg)})`);
    }
    // It's on multiple lines.
    lines.push(indent(realName + '(' + maybeTail(argList?.prefixTailComment)));
    level++;
    // If we have a command config pair, we'll try to use the controlKeywords to group separate lines
    if (cmdCfg.controlKeywords.size === 0 || isUndefined(argList)) {
      formatArgListLines(argList, cmdCfg);
    } else {
      // We have (at least one) control keyword.
      // Let's try to print each grouping on it's own line, if possible:
      const groups = groupArgsByControlKeyword(
        argList,
        cmdCfg.controlKeywords,
        cmdCfg.options,
      );
      for (const argOrGroup of groups) {
        if (isArgGroup(argOrGroup)) {
          const [name, args, tailComment] = argOrGroup;
          lines.push(indent(`${name}` + maybeTail(tailComment)));
          level++;
          const maybeSingle = singleLineLen({ args });
          if (maybeSingle > 0 && availableWidth() >= maybeSingle) {
            const line = indent(formatArgList({ args }));
            if (line.trim().length > 0) {
              lines.push(line);
            }
          } else {
            formatArgListLines({ args }, cmdCfg);
          }
          level--;
        } else {
          formatArgLine(argOrGroup);
        }
      }
    }
    level--;
    return indent(')');
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
