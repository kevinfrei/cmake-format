import {
  mkDirective,
  mkEOF,
  mkIdentifier,
  mkInlineComment,
  mkParen,
  mkQuoted,
  mkVariable,
  TokenType,
  type Parens,
  type Token,
} from './types';

export function peek(tokens: Token[]): Token {
  if (tokens.length === 0) {
    throw new Error('No tokens available');
  } else {
    return tokens[0]!;
  }
}

export function consume(tokens: Token[]): Token {
  return tokens.shift()!;
}

export function expect(
  tokens: Token[],
  type: Token['type'],
  value?: string,
): Token {
  const token = consume(tokens);
  if (token.type !== type || (value && token.value !== value)) {
    throw new Error(
      `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}'`,
    );
  }
  return token;
}

export function expectIdentifier(tokens: Token[]): string {
  return expect(tokens, TokenType.Identifier).value;
}

export function expectParen(tokens: Token[], val: Parens): void {
  expect(tokens, TokenType.Paren, val);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const lines = input.split(/\r?\n/);

  for (const line of lines) {
    const commentIndex = line.indexOf('#');
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart =
      commentIndex >= 0 ? line.slice(commentIndex).trim() : null;

    let i = 0;
    while (i < codePart.length) {
      const c = codePart[i]!;
      if (/\s/.test(c)) {
        i++;
      } else if (c === '(' || c === ')') {
        tokens.push(mkParen(c));
        i++;
      } else if (c === '"') {
        let j = i + 1;
        while (j < codePart.length && codePart[j] !== '"') j++;
        tokens.push(mkQuoted(codePart.slice(i + 1, j)));
        i = j + 1;
      } else if (c === '$' && codePart[i + 1] === '{') {
        let j = i + 2;
        while (j < codePart.length && codePart[j] !== '}') j++;
        tokens.push(mkVariable(codePart.slice(i + 2, j)));
        i = j + 1;
      } else {
        let j = i;
        while (j < codePart.length && /[^\s()"$]/.test(codePart[j]!)) j++;
        tokens.push(mkIdentifier(codePart.slice(i, j)));
        i = j;
      }
    }

    if (commentPart) {
      if (commentPart.includes('@format-on')) {
        tokens.push(mkDirective('@format-on'));
      } else if (commentPart.includes('@format-off')) {
        tokens.push(mkDirective('@format-off'));
      } else {
        tokens.push(mkInlineComment(commentPart));
      }
    }
  }

  tokens.push(mkEOF());
  return tokens;
}
