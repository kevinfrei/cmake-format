# @format-off
set(MY_LIBS lib1 lib2)
target_link_libraries(myApp PRIVATE ${MY_LIBS})
# @format-on
add_library(core STATIC core.cpp)
