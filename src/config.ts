import {
  chkArrayOf,
  chkPartialOf,
  chkRecordOf,
  isBoolean,
  isNumber,
  isString,
} from '@freik/typechk';
import * as fs from 'fs';
import * as path from 'path';

export type CommandConfig = {
  controlKeywords: string[];
  indentAfter: number;
  options: string[];
};

export type CommandConfigSet = {
  indentAfter: number;
  controlKeywords: Set<string>;
  options: Set<string>;
};

export const emptyCmdConfig: CommandConfig = Object.freeze({
  controlKeywords: [],
  indentAfter: -1,
  options: [],
});

export const emptyCmdConfigSet: CommandConfigSet = {
  controlKeywords: new Set(),
  indentAfter: -1,
  options: new Set(),
};

export type CommandConfigMap = Map<string, [string, CommandConfigSet]>;

export type Configuration = {
  useTabs: boolean;
  tabWidth: number;
  endOfLine: '\n' | '\r\n';
  printWidth: number;
  /*
    Any other config stuff belongs in here.
    I feel like I should probably have the ability to use keywords
    in various commands to also affect indentation
    Something like this:
  */
  commands: Record<string, Partial<CommandConfig>>;
};

const chkCommandConfig = chkPartialOf<CommandConfig>({
  controlKeywords: chkArrayOf(isString),
  indentAfter: isNumber,
  options: chkArrayOf(isString),
});

export const chkConfig = chkPartialOf<Configuration>({
  useTabs: isBoolean,
  tabWidth: isNumber,
  endOfLine: (v): v is '\n' | '\r\n' => v === '\n' || v === '\r\n',
  printWidth: isNumber,
  commands: chkRecordOf(isString, chkCommandConfig),
});

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
export const defaultCfg: Configuration = {
  useTabs: false,
  tabWidth: 2,
  endOfLine: '\n', // This one doesn't much matter for console.log output
  printWidth: 80,
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
    set: { indentAfter: 0 },
  },
  /*
  sort: {
    set: { skip: 1 },
  },
  */
};

export function getEOL(config: Partial<Configuration>): string {
  return config.endOfLine ?? defaultCfg.endOfLine;
}

function findConfigFile(): string | undefined {
  // Look up the directory tree for the file named ".passablerc.json"
  let currentDir = process.cwd();
  // This needs to handle both windows & *nix termination conditions:
  while (path.dirname(currentDir) != currentDir) {
    const configFile = path.join(currentDir, '.passablerc.json');
    if (fs.existsSync(configFile)) {
      return configFile;
    }
    currentDir = path.dirname(currentDir);
  }
  return;
}

function loadConfigFile(filePath: string): Partial<Configuration> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return chkConfig(data) ? data : {};
  } catch (error) {
    console.error(`Error parsing config file at ${filePath}:`, error);
    return {};
  }
}

export function loadConfig(): Partial<Configuration> {
  // Load configuration from a file or environment variables
  // Search up the directory tree for a config file
  const configFile = findConfigFile();
  if (configFile) {
    return loadConfigFile(configFile);
  }
  return {};
}

export function makeCommandConfigSet(config: CommandConfig): CommandConfigSet {
  return {
    controlKeywords: new Set(
      config.controlKeywords.map((s) => s.toUpperCase()),
    ),
    options: new Set(config.options.map((s) => s.toUpperCase())),
    indentAfter: config.indentAfter ?? 0,
  };
}

export function makeCommandConfigMap(
  commands: Record<string, Partial<CommandConfig>>,
): CommandConfigMap {
  const cmdMap = new Map<string, [string, CommandConfigSet]>();
  for (const [name, config] of Object.entries(commands)) {
    cmdMap.set(name.toLowerCase(), [
      name,
      makeCommandConfigSet({ ...emptyCmdConfig, ...config }),
    ]);
  }
  return cmdMap;
}
