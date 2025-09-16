import {
  chkArrayOf,
  chkPartialOf,
  chkRecordOf,
  hasField,
  isBoolean,
  isNumber,
  isString,
} from '@freik/typechk';
import * as fs from 'fs';
import * as path from 'path';
import defaultConfig from './defaults.json';

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

*******************
*** set(        ***
***   file_list ***
***     foo.cpp ***
***     bar.cpp ***
*** )           ***
*******************

*/

export const defaultCfg: Configuration = defaultConfig as Configuration;

export function getEOL(config: Partial<Configuration>): string {
  return config.endOfLine ?? defaultCfg.endOfLine;
}

function readConfigFile(): Partial<Configuration> | undefined {
  // Look up the directory tree for the file named ".passablerc.json"
  let currentDir = process.cwd();
  // This needs to handle both windows & *nix termination conditions:
  while (path.dirname(currentDir) != currentDir) {
    const configFile = path.join(currentDir, '.passablerc.json');
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf-8');
      try {
        const json = JSON.parse(data);
        return chkConfig(json) ? json : {};
      } catch (error) {
        console.error(`Error parsing ${configFile}:`, error);
      }
    }
    const packageFile = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageFile)) {
      try {
        const packageContent = fs.readFileSync(packageFile, 'utf-8');
        const packageData = JSON.parse(packageContent);
        if (hasField(packageData, 'passable')) {
          return chkConfig(packageData.passable) ? packageData.passable : {};
        }
      } catch (error) {
        console.error(`Error reading ${packageFile}:`, error);
      }
    }
    currentDir = path.dirname(currentDir);
  }
  return;
}


export function loadConfig(): Partial<Configuration> {
  // Load configuration from a file or environment variables
  // Search up the directory tree for a config file
  const configFile = readConfigFile();
  return configFile || {};
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
  primary: Record<string, Partial<CommandConfig>>,
  fallback: Record<string, Partial<CommandConfig>> = defaultConfig.commands,
): CommandConfigMap {
  const cmdMap = new Map<string, [string, CommandConfigSet]>();
  for (const [name, config] of Object.entries(fallback)) {
    cmdMap.set(name.toLowerCase(), [
      name,
      makeCommandConfigSet({ ...emptyCmdConfig, ...config }),
    ]);
  }
  for (const [name, config] of Object.entries(primary)) {
    cmdMap.set(name.toLowerCase(), [
      name,
      makeCommandConfigSet({ ...emptyCmdConfig, ...config }),
    ]);
  }
  return cmdMap;
}
