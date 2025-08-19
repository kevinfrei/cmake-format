set(TOOLS_HEADER_FILES toolbox.hpp)
set(TOOLS_SRC_FILES
  hiddenfile.cpp
  text_normalization.cpp
)

add_library(
  tools_lib
  STATIC
  ${TOOLS_SRC_FILES}
  ${TOOLS_HEADER_FILES}
)
if (${USE_COMMON_PCH})
target_precompile_headers(tools_lib REUSE_FROM pch_target)
endif()

# Specify the include directories for consumers of this library
target_include_directories(
  tools_lib
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/../include
)
