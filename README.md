# cmake-format

A CMake file formatter, written in Typescript

## Current status

This thing parses (and kinda prints) my silly little
[cassette](http://github.com/kevinfrei/cassette) project's CMakeLists.txt files.

It currently parses over 90% of the LLVM/Clang/LLDB CMake files which is, in my
opinion, quite a lot. Next steps on the 'completeness' side of things is to
drive this number up. I expect that LLVM's CMake build is one of the most
complex in existence, but it's also a very **good** use of CMake, so it isn't
necessarily going to have lots of weird stuff all over the place.

I haven't yet started thinking about what a "pretty" CMake file would look like,
but I'm approaching a point where I need to.

### TODO:

- Increase LLVM's CMake tokenization/parsing/printing success rate.
- Start making the printer actually print things nicely.
