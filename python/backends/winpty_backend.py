import base64
import os
import queue
import threading
import time

from winpty import PtyProcess


def decode_data(message):
    return base64.b64decode(message.get("data", "")).decode("utf-8", errors="replace")


def encode_data(data):
    if isinstance(data, str):
        data = data.encode("utf-8", errors="replace")
    return base64.b64encode(data).decode("ascii")


def run(init, send, read_command):
    command = [init["shell"]] + init.get("args", [])
    env = os.environ.copy()
    env.update(init.get("env", {}))
    output_queue = queue.Queue()
    command_queue = queue.Queue()
    stop_event = threading.Event()

    proc = PtyProcess.spawn(
        command,
        cwd=init["cwd"],
        env=env,
        dimensions=(int(init.get("rows", 24)), int(init.get("cols", 80))),
    )

    def reader():
        while not stop_event.is_set() and proc.isalive():
            try:
                data = proc.read(65536)
            except EOFError:
                break
            except Exception as error:
                output_queue.put({"type": "error", "message": str(error)})
                break

            if data:
                output_queue.put({"type": "data", "data": encode_data(data)})

        output_queue.put({"type": "exit", "exitCode": getattr(proc, "exitstatus", None) or 0})

    threading.Thread(target=reader, daemon=True).start()

    def command_reader():
        while not stop_event.is_set():
            command_queue.put(read_command())

    threading.Thread(target=command_reader, daemon=True).start()

    while True:
        try:
            while True:
                message = output_queue.get_nowait()
                send(message)
                if message.get("type") == "exit":
                    stop_event.set()
                    return
        except queue.Empty:
            pass

        try:
            message = command_queue.get_nowait()
            if message is None:
                stop_event.set()
                proc.terminate(force=True)
                send({"type": "exit", "exitCode": 0})
                return
        except queue.Empty:
            time.sleep(0.01)
            continue

        message_type = message.get("type")
        if message_type == "write":
            proc.write(decode_data(message))
        elif message_type == "resize":
            proc.setwinsize(int(message.get("rows", 24)), int(message.get("cols", 80)))
        elif message_type == "kill":
            stop_event.set()
            proc.terminate(force=True)

        time.sleep(0.01)
