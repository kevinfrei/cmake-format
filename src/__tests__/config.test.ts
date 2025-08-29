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
});
