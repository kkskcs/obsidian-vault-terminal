#!/usr/bin/env python3
import json
import os
import sys


def send(message):
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def read_message_line(stream):
    line = stream.readline()
    if not line:
        return None
    return json.loads(line.decode("utf-8"))


def main():
    init = read_message_line(sys.stdin.buffer)
    if not init or init.get("type") != "init":
        raise RuntimeError("Expected init message")

    if os.name == "nt":
        from backends.winpty_backend import run
    else:
        from backends.posix_backend import run

    run(init, send, lambda: read_message_line(sys.stdin.buffer))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        send({"type": "error", "message": str(error)})
        raise
