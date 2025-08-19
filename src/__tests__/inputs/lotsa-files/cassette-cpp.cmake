
add_subdirectory(tools)
add_subdirectory(musicdb)

set(LIB_SOURCE_FILES
  api.cpp
  config.cpp
  files.cpp
  from_json.cpp
  handlers.cpp
  quitting.cpp
  setup.cpp
  tools.cpp
  tunes.cpp
  websocket.cpp
  window.cpp)

add_library(
  cassette_lib
  STATIC
  ${LIB_SOURCE_FILES}
)

target_include_directories(
  cassette_lib
  PUBLIC
  ${PROJECT_SOURCE_DIR}/cpp/include
)

if (${USE_COMMON_PCH})
target_precompile_headers(cassette_lib REUSE_FROM pch_target)
endif()

# Link the dependencies with our binary
target_link_libraries(
  cassette_lib
  PUBLIC
  tools_lib
  musicdb_lib
  ${BOOST_LIB}
  ${CROW_LIB}
  ${MEDIAINFO_LIB}
  ${PFD_LIB}
)

# Compile main.cpp
add_executable(cassette main.cpp)

target_link_libraries(
  cassette
  PRIVATE
  cassette_lib
)

add_subdirectory(test)
