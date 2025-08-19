import {
  mkComment,
  mkDirective,
  mkEOF,
  mkIdentifier,
  mkInlineComment,
  mkParen,
  mkQuoted,
  mkVariable,
  TokenType,
  type Parens,
  type Tokenized,
  type TokenStream,
} from './types';

export function MakeTokenStream(input: string): TokenStream {
  const tokens: Tokenized[] = [];

  function peek(): Tokenized {
    if (tokens.length === 0) {
      throw new Error('No tokens available');
    } else {
      return tokens[0]!;
    }
  }

  function consume(): Tokenized {
    return tokens.shift()!;
  }

  function expect(type: Tokenized['type'], value?: string): Tokenized {
    const token = consume(tokens);
    if (token.type !== type || (value && token.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}'`,
      );
    }
    return token;
  }

  function expectIdentifier(): string {
    return expect(TokenType.Identifier).value;
  }

  function expectParen(val: Parens): void {
    expect(TokenType.Paren, val);
  }

  function tokenize(input: string): Tokenized[] {
    const lines = input.split(/\r?\n/);
    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const commentIndex = line.indexOf('#');
      const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      // Handle stand-alone
      if (codePart.trim().length === 0 && commentIndex >= 0) {
        const comment = line.slice(commentIndex).trim();
        if (comment.includes('@format-on')) {
          tokens.push(mkDirective('@format-on'));
        } else if (comment.includes('@format-off')) {
          tokens.push(mkDirective('@format-off'));
        } else {
          tokens.push(mkComment(comment));
        }
        continue;
      }
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
  tokenize(input);
  return {
    peek,
    consume,
    expect,
    expectIdentifier,
    expectParen,
    count: () => tokens.length,
  };
}
