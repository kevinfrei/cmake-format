import { globSync } from 'glob';

function deGlob(pathOrGlob: string): string[] {
  if (pathOrGlob.indexOf('*') >= 0 || pathOrGlob.indexOf('?') >= 0) {
    let res = pathOrGlob;
    res = res.replaceAll('\\', '\\\\');
    if (res.startsWith('!')) res = `\\${res}`;
    res = res.replaceAll('{', '\\{');
    res = res.replaceAll('}', '\\}');
    res = res.replaceAll('[', '\\]');
    res = res.replaceAll(']', '\\]');
    return globSync(res);
  }
  return [pathOrGlob];
}

export function expando(pathsOrGlobs: string[]): string[] {
  return pathsOrGlobs
    .map((v) => {
      const theGlob = deGlob(v);
      return theGlob ? theGlob : v;
    })
    .flat();
}
