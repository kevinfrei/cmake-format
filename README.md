# cmake-format

A CMake file formatter, written in Typescript

## Current status

This thing parses (and badly prints) my silly little
[cassette](http://github.com/kevinfrei/cassette) project's CMakeLists.txt files,
as well as **all 2000+** LLVM/Clang/LLDB/LLD CMake files which is, in my
opinion, good enough to be useful. Basically, it will parse and correctly
'round-trip' everything.

Next step: Actually pretty-printing!

### TODO:

- Start making the printer actually print things nicely.
