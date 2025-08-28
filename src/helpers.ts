import { Glob } from 'bun';

export function deGlob(pathOrGlob: string): Glob | undefined {
  if (pathOrGlob.indexOf('*') >= 0 || pathOrGlob.indexOf('?') >= 0) {
    let res = pathOrGlob;
    res = res.replaceAll('\\', '\\\\');
    if (res.startsWith('!')) res = `\\${res}`;
    res = res.replaceAll('{', '\\{');
    res = res.replaceAll('}', '\\}');
    res = res.replaceAll('[', '\\]');
    res = res.replaceAll(']', '\\]');
    return new Glob(res);
  }
  return undefined;
}

export function expando(pathsOrGlobs: string[]): string[] {
  return pathsOrGlobs
    .map((v) => {
      const theGlob = deGlob(v);
      return theGlob ? [...theGlob.scanSync('.')] : v;
    })
    .flat();
}

export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}
