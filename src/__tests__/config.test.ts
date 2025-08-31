import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { loadConfig } from '../config';
import { getTestFileName, printString } from './test-helpers';

describe('config', () => {
  test('file', () => {
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
      expect(Object.keys(config.commands!).length).toBe(3);
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
  test('formatting: indentAfter', () => {
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
  test('formatting: controlKeywords & options', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      // A couple control keywords, and an option
      const cmakeContent = `add_executable(myApp PuBlIc value value2
      private value3 value 5 thingy value6 )`;
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
      expect(lines[3]!).toBe('\t\tvalue value2');
      expect(lines[4]!).toBe('\tPRIVATE');
      expect(lines[5]!).toBe('\t\tvalue3 value 5');
      expect(lines[6]!).toBe('\tTHINGY');
      expect(lines[7]!).toBe('\tvalue6');
      expect(lines[8]!).toBe(')');
    } finally {
      process.chdir(cwd);
    }
  });
  test('formatting: more controlKeywords & options', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      // A couple control keywords, and an option
      const cmakeContent = `add_executable(myApp private value3 value 5 thingy value6
      PuBlIc value value2
      value4 value5.cpp value6.cpp value7.cpp value8.cpp value9.cpp value10.cpp
      INHERIT value11 value12 )`;
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
      expect(lines[2]!).toBe('\tPRIVATE');
      expect(lines[3]!).toBe('\t\tvalue3 value 5');
      expect(lines[4]!).toBe('\tTHINGY');
      expect(lines[5]!).toBe('\tvalue6');
      expect(lines[6]!).toBe('\tPUBLIC');
      expect(lines[7]!).toBe('\t\tvalue');
      expect(lines[8]!).toBe('\t\tvalue2');
      expect(lines[9]!).toBe('\t\tvalue4');
      expect(lines[10]!).toBe('\t\tvalue5.cpp');
      expect(lines[11]!).toBe('\t\tvalue6.cpp');
      expect(lines[12]!).toBe('\t\tvalue7.cpp');
      expect(lines[13]!).toBe('\t\tvalue8.cpp');
      expect(lines[14]!).toBe('\t\tvalue9.cpp');
      expect(lines[15]!).toBe('\t\tvalue10.cpp');
      expect(lines[16]!).toBe('\tINHERIT');
      expect(lines[17]!).toBe('\tvalue11');
      expect(lines[18]!).toBe('\tvalue12');
      expect(lines[19]!).toBe(')');
    } finally {
      process.chdir(cwd);
    }
  });
  test('formatting: target_link_libraries', () => {
    const cwd = process.cwd();
    try {
      process.chdir(
        path.dirname(getTestFileName('good-cfg-dir/test-dir/.passablerc.json')),
      );
      const config = loadConfig();
      // A couple control keywords, and an option
      const cmakeContent = `target_link_libraries(cassette_lib Public tools_lib
      musicdb_lib \${BOOST_LIB} \${CROW_LIB} \${MEDIAINFO_LIB} \${PFD_LIB})`;
      const res = printString(cmakeContent, config);
      // console.log(res);
      expect(res).toBeDefined();
      expect(res.indexOf('\r')).toBe(-1);
      // There should be no blank lines in our output
      const lines = res.split('\n');
      const blank = lines.findIndex((line) => line.trim().length === 0);
      expect(blank).toBe(-1);
      expect(lines[0]!).toBe('target_link_libraries(');
      expect(lines[1]!).toBe('\tcassette_lib');
      // From the config, indent args after the first by 1 more level for 'add_executable'
      expect(lines[2]!).toBe('\tPUBLIC');
      expect(lines[3]!).toBe('\t\ttools_lib');
      expect(lines[4]!).toBe('\t\tmusicdb_lib');
      expect(lines[5]!).toBe('\t\t\${BOOST_LIB}');
      expect(lines[6]!).toBe('\t\t\${CROW_LIB}');
      expect(lines[7]!).toBe('\t\t\${MEDIAINFO_LIB}');
      expect(lines[8]!).toBe('\t\t\${PFD_LIB}');
      expect(lines[9]!).toBe(')');
    } finally {
      process.chdir(cwd);
    }
  });
});
