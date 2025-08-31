import { describe, expect, test } from 'bun:test';
import { expando } from '../bun-helpers';
import { expando as nodeExpando } from '../node-helpers';

function isIn(array: string[], value: string): boolean {
  return array.indexOf('src/__tests__/inputs/' + value) !== -1;
}

describe('Expando (globbing)', () => {
  test('bun native glob patterns', () => {
    const files = expando(['**/CMakeLists.txt', '**/*.cmake']);
    expect(isIn(files, 'CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'good-cfg-dir/CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'bad-cfg-dir/CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'cassette-cpp-musicdb.cmake')).toBe(true);
    expect(isIn(files, 'simple.cmake')).toBe(true);
    expect(isIn(files, 'grammar.cmake')).toBe(true);
    expect(isIn(files, 'comments.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp-tools.cmake')).toBe(true);
    expect(isIn(files, 'cassette.cmake')).toBe(true);
    expect(isIn(files, 'directives.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp-test.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp.cmake')).toBe(true);
  });
  test('node glob patterns', () => {
    const files = nodeExpando(['**/CMakeLists.txt', '**/*.cmake']);
    expect(isIn(files, 'CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'good-cfg-dir/CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'bad-cfg-dir/CMakeLists.txt')).toBe(true);
    expect(isIn(files, 'cassette-cpp-musicdb.cmake')).toBe(true);
    expect(isIn(files, 'simple.cmake')).toBe(true);
    expect(isIn(files, 'grammar.cmake')).toBe(true);
    expect(isIn(files, 'comments.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp-tools.cmake')).toBe(true);
    expect(isIn(files, 'cassette.cmake')).toBe(true);
    expect(isIn(files, 'directives.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp-test.cmake')).toBe(true);
    expect(isIn(files, 'cassette-cpp.cmake')).toBe(true);
  });
});
