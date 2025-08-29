import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { loadConfig } from '../config';
import { getTestFileName, printString } from './test-helpers';

describe('config tests', () => {
  test('config file', () => {
    const cwd = process.cwd();
    try {
      process.chdir(path.dirname(getTestFileName('.passablerc.json')));
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
      expect(config.commands!.set!.indent).toBe(1);
    } finally {
      process.chdir(cwd);
    }
  });
  test('config settings', () => {
    const cwd = process.cwd();
    try {
      process.chdir(path.dirname(getTestFileName('.passablerc.json')));
      const config = loadConfig();
      const cmakeContent = `
      set(SOME_COMMAND value "other value here"
      "still" "more" "values" #[=[here]=] yup here we go)
      `;
      const res = printString(cmakeContent, config);
      // console.log(res);
      expect(res).toBeDefined();
      expect(res.indexOf('\r')).toBe(-1);
    } finally {
      process.chdir(cwd);
    }
  });
});
