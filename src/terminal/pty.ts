import type * as nodePty from 'node-pty';
import * as path from 'path';
import { LocaleSetting, resolveLocale } from '../config/configManager';

interface PtyOptions {
  vaultRoot: string;
  pluginDir: string;
  env?: Record<string, string>;
  locale?: LocaleSetting;
  appLocale?: string;
  cols?: number;
  rows?: number;
}

export class PtyManager {
  private pty: nodePty.IPty | null = null;

  spawn(options: PtyOptions): nodePty.IPty {
    const { shell, args } = this.detectShell();
    const { vaultRoot, pluginDir, env = {}, locale = 'system', appLocale = 'en', cols = 80, rows = 24 } = options;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodePtyModule: typeof nodePty = require(path.join(pluginDir, 'node_modules', 'node-pty'));

    const resolvedLocale = resolveLocale(locale, appLocale);
    const localeEnv: Record<string, string> = resolvedLocale
      ? { LANG: resolvedLocale, LC_ALL: resolvedLocale }
      : { LC_CTYPE: 'UTF-8' };

    this.pty = nodePtyModule.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: vaultRoot,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined),
        ),
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

  private detectShell(): { shell: string; args: string[] } {
    if (process.platform === 'win32') {
      return { shell: process.env.COMSPEC ?? 'cmd.exe', args: [] };
    }
    const shell = process.env.SHELL ?? '/bin/bash';
    const shellName = path.basename(shell).toLowerCase();

    if (shellName === 'zsh' || shellName === 'bash') {
      return { shell, args: ['-il'] };
    }

    if (shellName === 'fish') {
      return { shell, args: ['--login'] };
    }

    return { shell, args: [] };
  }
}
