enable_testing()

set(TEST_SOURCE_FILES
  json_test.cpp
  config_test.cpp
  fileindex_test.cpp
  text_norm_test.cpp
)

add_executable(cassette_cpptst ${TEST_SOURCE_FILES})
if (${USE_COMMON_PCH})
target_precompile_headers(cassette_cpptst REUSE_FROM pch_target)
endif()
target_link_libraries(
  cassette_cpptst
  PUBLIC
  ${GTEST_LIB} 
  cassette_lib 
  tools_lib
  musicdb_lib
  ${BOOST_LIB}
  ${CROW_LIB}
  GTest::gtest_main
)
add_test(thetest cassette_cpptst)

include(GoogleTest)
gtest_discover_tests(cassette_cpptst)
