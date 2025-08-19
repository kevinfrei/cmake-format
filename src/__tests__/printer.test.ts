import { describe, expect, test } from 'bun:test';
import { parseCMakeFile } from '../parser';
import { printCMake } from '../printer';
import { tokenize } from '../tokenizer';
import { loadFile } from './load-file';

describe('Pretty Printer', () => {
  test('prints basic command', () => {
    const input = loadFile('simple.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    const output = printCMake(ast).join('\n');
    expect(output).toContain('add_executable');
  });

  test('preserves comments', () => {
    const input = loadFile('comments.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    const output = printCMake(ast).join('\n');
    expect(output).toContain('# Build the app');
    expect(output).toContain('# builds main app');
  });

  test('respects format directives', () => {
    const input = loadFile('directives.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    const output = printCMake(ast).join('\n');
    expect(output).toContain('@format-off');
    expect(output).toContain('target_link_libraries');
  });
  
  test('handles macros and conditionals', () => {
    const input = loadFile('grammar.cmake');
    const tokens = tokenize(input);
    const ast = parseCMakeFile(tokens, input.split('\n'));
    const output = printCMake(ast).join('\n');
    expect(output).toContain('macro(my_macro');
    expect(output).toContain('if(BUILD_TESTS)');
    expect(output).toContain('endif()');
  });
});
