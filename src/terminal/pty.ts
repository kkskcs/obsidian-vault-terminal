import { ChildProcessWithoutNullStreams, spawn as spawnProcess } from 'child_process';
import * as path from 'path';
import { StringDecoder } from 'string_decoder';
import { LocaleSetting, resolveLocale } from '../config/configManager';

interface PtyOptions {
  vaultRoot: string;
  pluginDir: string;
  env?: Record<string, string>;
  locale?: LocaleSetting;
  appLocale?: string;
  pythonPath?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

interface PtyExitEvent {
  exitCode: number;
}

interface PtyProcess {
  onData(callback: (data: string) => void): void;
  onExit(callback: (event: PtyExitEvent) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

type HelperMessage =
  | { type: 'data'; data: string }
  | { type: 'exit'; exitCode?: number }
  | { type: 'error'; message: string };

class PythonPtyProcess implements PtyProcess {
  private dataCallbacks: Array<(data: string) => void> = [];
  private exitCallbacks: Array<(event: PtyExitEvent) => void> = [];
  private decoder = new StringDecoder('utf8');
  private stdoutBuffer = '';
  private exited = false;

  constructor(private readonly helper: ChildProcessWithoutNullStreams) {
    this.helper.stdout.setEncoding('utf8');
    this.helper.stdout.on('data', (chunk: string) => this.handleStdout(chunk));
    this.helper.stderr.on('data', (chunk) => console.error('[Vault Terminal Python PTY]', chunk.toString()));
    this.helper.on('exit', (code) => this.emitExit(code ?? 0));
    this.helper.on('error', (error) => {
      console.error('Vault Terminal Python PTY helper failed', error);
      this.emitExit(1);
    });
  }

  onData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: (event: PtyExitEvent) => void): void {
    this.exitCallbacks.push(callback);
  }

  write(data: string): void {
    this.send({ type: 'write', data: Buffer.from(data, 'utf8').toString('base64') });
  }

  resize(cols: number, rows: number): void {
    this.send({ type: 'resize', cols, rows });
  }

  kill(): void {
    this.send({ type: 'kill' });
    setTimeout(() => {
      if (!this.exited) {
        this.helper.kill();
      }
    }, 1000);
  }

  send(message: Record<string, unknown>): void {
    if (this.exited || !this.helper.stdin.writable) {
      return;
    }
    this.helper.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;

    while (true) {
      const newline = this.stdoutBuffer.indexOf('\n');
      if (newline === -1) {
        return;
      }

      const line = this.stdoutBuffer.slice(0, newline);
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line.trim()) {
        continue;
      }

      this.handleMessage(JSON.parse(line) as HelperMessage);
    }
  }

  private handleMessage(message: HelperMessage): void {
    if (message.type === 'data') {
      const data = this.decoder.write(Buffer.from(message.data, 'base64'));
      this.dataCallbacks.forEach((callback) => callback(data));
      return;
    }

    if (message.type === 'error') {
      console.error('Vault Terminal Python PTY helper error:', message.message);
      this.emitExit(1);
      return;
    }

    this.emitExit(message.exitCode ?? 0);
  }

  private emitExit(exitCode: number): void {
    if (this.exited) {
      return;
    }

    this.exited = true;
    const remainingData = this.decoder.end();
    if (remainingData) {
      this.dataCallbacks.forEach((callback) => callback(remainingData));
    }
    this.exitCallbacks.forEach((callback) => callback({ exitCode }));
  }
}

export class PtyManager {
  private pty: PtyProcess | null = null;

  async spawn(options: PtyOptions): Promise<PtyProcess> {
    const {
      vaultRoot,
      pluginDir,
      env = {},
      locale = 'system',
      appLocale = 'en',
      pythonPath,
      shell: shellOverride,
      cols = 80,
      rows = 24,
    } = options;
    const { shell, args } = this.detectShell(shellOverride);
    const resolvedLocale = resolveLocale(locale, appLocale);
    const localeEnv: Record<string, string> = resolvedLocale
      ? { LANG: resolvedLocale, LC_ALL: resolvedLocale }
      : { LC_CTYPE: 'UTF-8' };

    const helperScript = path.join(pluginDir, 'python', 'pty_helper.py');
    const candidates = this.detectPythonCandidates(pythonPath);

    let helper: ChildProcessWithoutNullStreams | null = null;
    for (const candidate of candidates) {
      const proc = spawnProcess(candidate, [helperScript], {
        cwd: vaultRoot,
        stdio: 'pipe',
        windowsHide: true,
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (err: Error) => { cleanup(); reject(err); };
          const onSpawn = () => { cleanup(); resolve(); };
          const cleanup = () => {
            proc.removeListener('error', onError);
            proc.removeListener('spawn', onSpawn);
          };
          proc.on('error', onError);
          proc.on('spawn', onSpawn);
        });
        helper = proc;
        break;
      } catch {
        // try next candidate
      }
    }

    if (!helper) {
      throw new Error(`Could not find Python. Tried: ${candidates.join(', ')}`);
    }

    this.pty = new PythonPtyProcess(helper);
    (this.pty as PythonPtyProcess).send({
      type: 'init',
      shell,
      args,
      cwd: vaultRoot,
      cols,
      rows,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined),
        ),
        TERM: 'xterm-256color',
        VAULT_ROOT: vaultRoot,
        OBSIDIAN_PLUGIN_DIR: pluginDir,
        ...localeEnv,
        ...env,
      },
    });

    this.pty.onExit(() => {
      this.pty = null;
    });

    return this.pty;
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  kill(): void {
    this.pty?.kill();
    this.pty = null;
  }

  private detectShell(shellOverride?: string): { shell: string; args: string[] } {
    const shell = shellOverride
      || (process.platform === 'win32' ? 'powershell' : (process.env.SHELL ?? '/bin/bash'));
    const shellName = path.basename(shell).toLowerCase();

    if (process.platform === 'win32') {
      if (shellName === 'powershell.exe' || shellName === 'pwsh.exe' || shellName === 'pwsh') {
        return { shell, args: ['-NoLogo'] };
      }
      return { shell, args: [] };
    }

    if (shellName === 'zsh' || shellName === 'bash') {
      return { shell, args: ['-il'] };
    }

    if (shellName === 'fish') {
      return { shell, args: ['--login'] };
    }

    return { shell, args: [] };
  }

  private detectPythonCandidates(pythonPath?: string): string[] {
    if (pythonPath) return [pythonPath];
    if (process.env.VAULT_TERMINAL_PYTHON) return [process.env.VAULT_TERMINAL_PYTHON];
    return process.platform === 'win32' ? ['python3', 'py'] : ['python3'];
  }
}
