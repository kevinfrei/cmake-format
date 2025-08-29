import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { loadConfig } from '../config';
import { getTestFileName, printString } from './test-helpers';

describe('config tests', () => {
  test('config file', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      expect(config).toBeDefined();
      expect(config.endOfLine).toBe('\n');
      expect(config.tabWidth).toBe(3);
      expect(config.useTabs).toBe(true);
      expect(config.commands).toBeDefined();
      expect(Object.keys(config.commands!).length).toBe(2);
      expect(config.commands!.add_executable).toBeDefined();
      expect(Object.keys(config.commands!.add_executable!).length).toBe(2);
      expect(config.commands!.add_executable!.controlKeywords).toEqual([
        'PUBLIC',
        'PRIVATE',
      ]);
      expect(config.commands!.add_executable!.options).toEqual([
        'INHERIT',
        'THINGY',
      ]);
      expect(config.commands!.set).toBeDefined();
      expect(Object.keys(config.commands!.set!).length).toBe(1);
      expect(config.commands!.set!.indentAfter).toBe(0);
      process.chdir('../../bad-cfg-dir');
      console.error('*******************************');
      console.error('* EXPECTED ERROR OUTPUT BEGIN *');
      console.error('*******************************');
      const cfg = loadConfig();
      console.error('*******************************');
      console.error('*  EXPECTED ERROR OUTPUT END  *');
      console.error('*******************************');
      expect(cfg).toBeDefined();
      expect(Object.keys(cfg).length).toBe(0);
    } finally {
      process.chdir(cwd);
    }
  });
  test('config formatting check: indentAfter', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      const cmakeContent = `set(
      SOME_COMMAND value "other value here"
      "still" "more"
      "values" #[=[here is a block comment]=] yup here we go)`;
      const res = printString(cmakeContent, config);
      // console.log(res);
      expect(res).toBeDefined();
      expect(res.indexOf('\r')).toBe(-1);
      // There should be no blank lines in our output
      const lines = res.split('\n');
      const blank = lines.findIndex((line) => line.trim().length === 0);
      expect(blank).toBe(-1);
      expect(lines[0]!).toBe('set(');
      expect(lines[1]!).toBe('\tSOME_COMMAND');
      // From the config, indent args after the first by 1 more level for 'set'
      expect(lines[2]!).toBe('\t\tvalue');
      expect(lines[lines.length - 2]!).toBe('\t\tgo');
      expect(lines[lines.length - 1]!).toBe(')');
    } finally {
      process.chdir(cwd);
    }
  });
  test('config formatting check: controlKeywords & options', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      // A couple control keywords, and an option
      const cmakeContent = `add_executable(myApp PuBlIc value value2
      private value3 thingy value 5 value6 )`;
      const res = printString(cmakeContent, config);
      // console.log(res);
      expect(res).toBeDefined();
      expect(res.indexOf('\r')).toBe(-1);
      // There should be no blank lines in our output
      const lines = res.split('\n');
      const blank = lines.findIndex((line) => line.trim().length === 0);
      expect(blank).toBe(-1);
      expect(lines[0]!).toBe('add_executable(');
      expect(lines[1]!).toBe('\tmyApp');
      // From the config, indent args after the first by 1 more level for 'add_executable'
      expect(lines[2]!).toBe('\tPUBLIC');
      expect(lines[3]!).toBe('\t\tvalue');
      expect(lines[4]!).toBe('\t\tvalue2');
      expect(lines[5]!).toBe('\tPRIVATE');
      expect(lines[6]!).toBe('\t\tvalue3');
      expect(lines[7]!).toBe('\t\tTHINGY');
      expect(lines[8]!).toBe('\t\tvalue');
      expect(lines[9]!).toBe('\t\t5');
      expect(lines[10]!).toBe('\t\tvalue6');
      expect(lines[11]!).toBe(')');
    } finally {
      process.chdir(cwd);
    }
  });
});
