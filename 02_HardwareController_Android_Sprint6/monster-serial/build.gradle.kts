plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

val skipNativeBuild = providers.gradleProperty("skipNativeBuild").orNull == "true"

android {
    namespace = "com.littlemonster.serial"
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        minSdk = 23
        if (!skipNativeBuild) {
            externalNativeBuild {
                cmake { cppFlags += "-std=c++17" }
            }
            ndk { abiFilters += listOf("armeabi-v7a") }
        }
    }

    if (!skipNativeBuild) {
        externalNativeBuild {
            cmake {
                path = file("src/main/cpp/CMakeLists.txt")
                version = "3.22.1"
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
