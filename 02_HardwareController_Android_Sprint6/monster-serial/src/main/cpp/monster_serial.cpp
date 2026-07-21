#include <jni.h>
#include <fcntl.h>
#include <unistd.h>
#include <termios.h>
#include <sys/select.h>
#include <cerrno>

static speed_t baud_to_speed(int baud) {
    switch (baud) {
        case 9600: return B9600;
        case 19200: return B19200;
        case 38400: return B38400;
        case 57600: return B57600;
        case 115200: return B115200;
        default: return 0;
    }
}

extern "C" JNIEXPORT jint JNICALL
Java_com_littlemonster_serial_NativeSerial_open(JNIEnv* env, jobject, jstring path_, jint baud) {
    const char* path = env->GetStringUTFChars(path_, nullptr);
    int fd = open(path, O_RDWR | O_NOCTTY | O_NONBLOCK | O_CLOEXEC);
    env->ReleaseStringUTFChars(path_, path);
    if (fd < 0) return -errno;

    speed_t speed = baud_to_speed(baud);
    if (speed == 0) { close(fd); return -EINVAL; }

    termios tty{};
    if (tcgetattr(fd, &tty) != 0) { int e = errno; close(fd); return -e; }
    cfmakeraw(&tty);
    cfsetispeed(&tty, speed);
    cfsetospeed(&tty, speed);
    tty.c_cflag |= CLOCAL | CREAD;
    tty.c_cflag &= ~CSTOPB;
    tty.c_cflag &= ~PARENB;
    tty.c_cflag &= ~CSIZE;
    tty.c_cflag |= CS8;
    tty.c_cc[VMIN] = 0;
    tty.c_cc[VTIME] = 0;
    if (tcsetattr(fd, TCSANOW, &tty) != 0) { int e = errno; close(fd); return -e; }
    tcflush(fd, TCIFLUSH);
    return fd;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_littlemonster_serial_NativeSerial_read(JNIEnv* env, jobject, jint fd, jbyteArray buffer, jint timeoutMs) {
    if (fd < 0) return -EBADF;
    fd_set set;
    FD_ZERO(&set);
    FD_SET(fd, &set);
    timeval tv{ timeoutMs / 1000, (timeoutMs % 1000) * 1000 };
    int ready = select(fd + 1, &set, nullptr, nullptr, &tv);
    if (ready == 0) return 0;
    if (ready < 0) return errno == EINTR ? -1 : -errno;

    jsize capacity = env->GetArrayLength(buffer);
    jbyte* bytes = env->GetByteArrayElements(buffer, nullptr);
    ssize_t count = ::read(fd, bytes, static_cast<size_t>(capacity));
    if (count > 0) env->ReleaseByteArrayElements(buffer, bytes, 0);
    else env->ReleaseByteArrayElements(buffer, bytes, JNI_ABORT);
    if (count < 0) return (errno == EAGAIN || errno == EINTR) ? -1 : -errno;
    return static_cast<jint>(count);
}

extern "C" JNIEXPORT jint JNICALL
Java_com_littlemonster_serial_NativeSerial_write(JNIEnv* env, jobject, jint fd, jbyteArray data) {
    if (fd < 0) return -EBADF;
    const jsize length = env->GetArrayLength(data);
    if (length <= 0) return -EINVAL;
    jbyte* bytes = env->GetByteArrayElements(data, nullptr);
    ssize_t total = 0;
    while (total < length) {
        ssize_t written = ::write(fd, bytes + total, static_cast<size_t>(length - total));
        if (written > 0) {
            total += written;
            continue;
        }
        if (written < 0 && (errno == EINTR || errno == EAGAIN)) continue;
        int error = errno;
        env->ReleaseByteArrayElements(data, bytes, JNI_ABORT);
        return -error;
    }
    tcdrain(fd);
    env->ReleaseByteArrayElements(data, bytes, JNI_ABORT);
    return static_cast<jint>(total);
}

extern "C" JNIEXPORT void JNICALL
Java_com_littlemonster_serial_NativeSerial_close(JNIEnv*, jobject, jint fd) {
    if (fd >= 0) ::close(fd);
}
