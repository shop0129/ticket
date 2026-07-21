cmake_minimum_required(VERSION 3.22.1)
project(monster_serial)

add_library(monster_serial SHARED monster_serial.cpp)
find_library(log-lib log)
target_link_libraries(monster_serial ${log-lib})
