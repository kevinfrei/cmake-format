# passable

### A CMake file formatter

This is an attempt to make a CMake file formatter, spiritually inspired by Chris
Chedeau's excellent [Prettier Javascript formatter](https://prettier.io). Having
also had to deal with
[clang-format](https://clang.llvm.org/docs/ClangFormatStyleOptions.html)'s
embrace of every random configuration choice anyone might have come up with, I
very much prefer
[Prettier's philosophy](https://prettier.io/docs/option-philosophy). To be fair,
C++ is a much larger language than Javascript, but CMake certainly isn't. So,
I'm using Prettier's philosophy to start from. The real problem, however, is
that no `CMakeLists.txt` file will _ever_ be **pretty**. Thus the goal of this
formatter is to make CMake files not any prettier, but at least _passable_.

## Current status

This thing parses **all 2000+** LLVM/Clang/LLDB/LLD CMake files as of this
writing, which is (IMO) good enough to be useful because that's a very complex
build system (I'm also a little familiar with it). Actually, it parses and
correctly 'round-trips' all those files at the token level: `passable` produces
the same token stream before and after formatting.

I hand-wrote a lexer and parser because the grammar as documented in pieces on
[CMake's website](https://cmake.org/cmake/help/latest/manual/cmake-language.7.html)
is not actually close to correct or complete. I started by trying to vibe-code
the tokenizer and parser with AI. That resulted in a very mediocre tokenizer and
parser with lots of random problems: exactly what I'd expect from something
trained on all the code you can find on GitHub. :neutral_face: Making an actual
flex/bison (or probably [`peg.js`](https://github.com/pegjs/pegjs)) based parser
was really more than I thought I needed. I'm not sure that's still true, after
having dealt with all the stupid corner cases of where comments can go, but the
whole thing is pretty small, so needing to know details of fewer tools seems
like a good trade-off. Maybe I'll migrate to `peg.js` in the future...

I should probably go through the failures I fixed to get an improved test bed,
but that's just not happening yet. I'm retired, and this is one of the sillier
rabbit-holes I've gone down. I do, however, appear to have gone _all the way
down_ this rabbit-hole.

Next step: Actually pretty-printing!

### TODO:

- Start making the printer actually print things nicely.
