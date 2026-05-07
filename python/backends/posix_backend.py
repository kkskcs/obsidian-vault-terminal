import base64
import fcntl
import os
import pty
import selectors
import signal
import struct
import sys
import termios


def set_winsize(fd, cols, rows):
    size = struct.pack("HHHH", int(rows), int(cols), 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, size)


def decode_data(message):
    return base64.b64decode(message.get("data", ""))


def run(init, send, read_command):
    shell = init["shell"]
    args = init.get("args", [])
    cwd = init["cwd"]
    env = os.environ.copy()
    env.update(init.get("env", {}))

    pid, master_fd = pty.fork()

    if pid == 0:
        os.chdir(cwd)
        os.environ.clear()
        os.environ.update(env)
        os.execvp(shell, [shell] + args)

    set_winsize(master_fd, init.get("cols", 80), init.get("rows", 24))
    os.set_blocking(master_fd, False)
    os.set_blocking(sys.stdin.fileno(), False)

    selector = selectors.DefaultSelector()
    selector.register(master_fd, selectors.EVENT_READ, "pty")
    selector.register(sys.stdin.buffer, selectors.EVENT_READ, "stdin")

    while True:
        exited_pid, status = os.waitpid(pid, os.WNOHANG)
        if exited_pid == pid:
            send({"type": "exit", "exitCode": os.waitstatus_to_exitcode(status)})
            return

        for key, _ in selector.select(timeout=0.05):
            if key.data == "pty":
                try:
                    data = os.read(master_fd, 65536)
                except BlockingIOError:
                    continue
                except OSError:
                    send({"type": "exit", "exitCode": 0})
                    return

                if not data:
                    send({"type": "exit", "exitCode": 0})
                    return

                send({"type": "data", "data": base64.b64encode(data).decode("ascii")})
                continue

            message = read_command()
            if message is None:
                os.kill(pid, signal.SIGHUP)
                send({"type": "exit", "exitCode": 0})
                return

            message_type = message.get("type")
            if message_type == "write":
                os.write(master_fd, decode_data(message))
            elif message_type == "resize":
                set_winsize(master_fd, message.get("cols", 80), message.get("rows", 24))
            elif message_type == "kill":
                os.kill(pid, signal.SIGHUP)
