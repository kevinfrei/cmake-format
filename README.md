# passable

### A CMake auto formatter

_There's no way to make CMake files prettier, but should at least be
**passable**_.

This is an attempt to make a CMake file formatter, spiritually inspired by Chris
Chedeau's excellent [Prettier Javascript formatter](https://prettier.io). Having
also had to deal with
[clang-format](https://clang.llvm.org/docs/ClangFormatStyleOptions.html)'s
embrace of every random configuration choice anyone might have come up with, I
very much prefer
[Prettier's philosophy](https://prettier.io/docs/option-philosophy). To be fair,
C++ is a much larger language than Javascript, but CMake certainly isn't. So,
I'm using Prettier's philosophy to start from. The real problem, however, is
that no `CMakeLists.txt` file will _ever_ be **pretty**. Thus, this formatter
will not even attempt to make your CMake files any prettier, but it will
hopefully make them at least **_passable_**.

## Using `passable` to format CMake files

Passable is writte in Typescript using the
[`bun` Javascript runtime](http://bun.sh)
`passable -i **/CMakeLists.txt **/*.cmake` will get you started, in your
source-controlled repository.

To change various settings, create a `.passablerc.json` file, and put it
alongside (or 'above') the root of your CMake project. The JSON file is a single
object (so, wrap it in `{}`'s) and can contain any of the following options:

- **`"useTabs"`**: true or false
  - kinda self-explanatory...
- **`"tabWidth"`**: positive integer
  - The number of spaces to use, or at least the number of spaces a tab will
    use, as measured against the `printWidth`.
- **`"endOfLine"`**: `"\n"` or `"\r\n"`
  - Which character to use for line endings (only applies for "in-place" file
    modification)
- **`"printWidth"`**: positive integer.
  - The maximum line length for code. This doesn't restrict comments. Any 'end
    of line' comment will stay with the code immediate before it, and all other
    comments are included as original, though they may be indented differently
- **`"commands"`**: A JS object of CMake commands and settings to affect the
  formatting of those commands.
  - Each command is name (`"set"` or `"add_executable"` for example), followed
    by an object with up to three different options:
  - **`"controlKeywords"`**: An array of keywords.
    - These keywords will be used to indent the subsequent arguments to the
      command further. Think `"PUBLIC"` `"STATIC"` or `"OBJECT"` on a command
      invocation of `add_library`.
  - **`"options"`**: An array of strings.
    - Arguments that should be capitalized for the command. For example, the
      `add_executable` command would include `WIN32`, `MACOSX_BUNDLE`,
      `IMPORTED`, `ALIAS`, and `EXCLUDE_FROM_ALL`.
  - **`"indentAfter"`**: positive integer
    - All arguments will be indented one level further after the argument
      specified. `set` has this set to '0' so the variable name is at 1 level of
      indentation, and the values assigned are indented 2 levels.

## Sample .passablerc.json file:

_Actually, this is the default configuration, at least it is as I'm writing
this._ :smile:

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "endOfLine": "\n",
  "printWidth": 80,
  "commands": {
    "add_library": {
      "controlKeywords": [
        "STATIC",
        "SHARED",
        "MODULE",
        "OBJECT",
        "INTERFACE",
        "UNKNOWN",
        "ALIAS"
      ],
      "options": ["GLOBAL", "EXCLUDE_FROM_ALL", "IMPORTED"]
    },
    "add_executable": {
      "options": [
        "WIN32",
        "MACOSX_BUNDLE",
        "EXCLUDE_FROM_ALL",
        "IMPORTED",
        "ALIAS"
      ]
    },
    "target_sources": {
      "controlKeywords": [
        "INTERFACE",
        "PUBLIC",
        "PRIVATE",
        "FILE_SET",
        "TYPE",
        "BASE_DIRS",
        "FILES"
      ],
      "options": ["HEADERS", "CXX_MODULES"]
    },
    "target_precompile_headers": {
      "controlKeywords": ["INTERFACE", "PUBLIC", "PRIVATE", "REUSE_FROM"]
    },
    "target_compile_definitions": {
      "controlKeywords": ["INTERFACE", "PUBLIC", "PRIVATE"]
    },
    "target_include_directories": {
      "controlKeywords": ["INTERFACE", "PUBLIC", "PRIVATE"]
    },
    "set": { "indentAfter": 0 }
  }
}
```

## Current Status

Usable & useful! It's not yet published to NPM, yet, though, so it's only really
usable by me, or someone who wants to add a github dependency to their
package.json file :laughing:

This thing parses **all 2000+** LLVM/Clang/LLDB/LLD CMake files as of this
writing, which is (IMO) good enough to be useful because that's a very complex
build system (I'm also a little familiar with it). Actually, it parses and
correctly 'round-trips' all those files at the token level: `passable` produces
the same token stream before and after formatting.

It does _not_ attempt to do anything fancy with variables or other syntax like
that. So all the `${SOURCE_FILE_LISTS}` and `$<other:monstrosities>` are left as
arguments.

If you find any problems, where the output isn't still syntactically identical,
please open an issue. I'll try to fix it as quickly as my very busy retired life
will allow!

## Implementation details

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

I'm retired, and this is one of the sillier rabbit-holes I've gone down. I do,
however, appear to have gone _all the way down_ this rabbit-hole.

### TODO:

- Publish to NPM (and make it something you can invoke globally, right?)
