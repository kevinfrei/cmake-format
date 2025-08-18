macro(my_macro arg1 arg2)
  message("Inside macro")
endmacro()

if(BUILD_TESTS)
  add_executable(testApp test.cpp)
endif()
