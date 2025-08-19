# Minimum version of CMake required to build this project
cmake_minimum_required(VERSION 3.28.0)

# Name of the project
project(cassette)

# Why not?
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(MSVC)
  # For windows/VC++, run normal exception handling & windows 10 APIs
  set(CMAKE_CXX_FLAGS "/EHsc /D_WIN32_WINNT=0x0A00 /DWINVER=0x0A00")
  if (CMAKE_BUILD_TYPE STREQUAL "Debug")
    # untested.
    # I wonder if RTC still works. I should use it, since I did the work:
    add_compile_options(/W4 /Od /RTC1 /D_CRT_SECURE_NO_WARNINGS)
  else()
    add_compile_options(/W4 /O2 /D_CRT_SECURE_NO_WARNINGS)
  endif()
  set(USE_COMMON_PCH OFF)
else()
  # For non-windows compilers, enable sanitizers and stuff
  add_compile_options(-Wpedantic -Wall -Wextra -Werror -pedantic)
  if (CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options(-fsanitize=address,undefined -O0 -g)
    add_link_options(-fsanitize=address,undefined -O0 -g)
  else()
    add_compile_options(-flto -O2)
    add_link_options(-flto)
  endif()
  set(USE_COMMON_PCH ON)
endif()

# Find Conan2 generated libraries
include(build/ConanLibImports.cmake)

if (${USE_COMMON_PCH})
add_library(pch_target OBJECT cpp/pch.cpp)
target_precompile_headers(
  pch_target
  PRIVATE
  <atomic>
  <cctype>
  <chrono>
  <cstdint>
  <cstdlib>
  <filesystem>
  <fstream>
  <functional>
  <iomanip>
  <iostream>
  <map>
  <optional>
  <random>
  <set>
  <shared_mutex>
  <sstream>
  <string_view>
  <string>
  <tuple>
  <type_traits>
  <unordered_map>
  <unordered_set>
  <utility>
  <vector>
)
endif()

add_subdirectory(cpp)
