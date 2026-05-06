import * as path from 'path';
import type * as nodePty from 'node-pty';

interface PtyOptions {
  vaultRoot: string;
  pluginDir: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export class PtyManager {
  private pty: nodePty.IPty | null = null;

  spawn(options: PtyOptions): nodePty.IPty {
    const shell = this.detectShell();
    const { vaultRoot, pluginDir, env = {}, cols = 80, rows = 24 } = options;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodePtyModule: typeof nodePty = require(path.join(pluginDir, 'node_modules', 'node-pty'));

    this.pty = nodePtyModule.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: vaultRoot,
      env: {
        ...Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)),
        VAULT_ROOT: vaultRoot,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
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

  private detectShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC ?? 'cmd.exe';
    }
    return process.env.SHELL ?? '/bin/bash';
  }
}
