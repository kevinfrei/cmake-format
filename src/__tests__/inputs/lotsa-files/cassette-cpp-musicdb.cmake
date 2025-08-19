set(
  MUSICDB_SRC_FILES
  fileindex.cpp
  metadata.cpp
  musicdb.cpp
)

add_library(
  musicdb_lib
  OBJECT
  ${MUSICDB_SRC_FILES}
)

if (${USE_COMMON_PCH})
target_precompile_headers(musicdb_lib REUSE_FROM pch_target)
endif()

target_link_libraries(
  musicdb_lib
  PUBLIC
  ${BOOST_LIB}
  ${CROW_LIB}
  ${MEDIAINFO_LIB}
)

# Specify the include directories for consumers of this library
target_include_directories(
  musicdb_lib
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/../include
)
