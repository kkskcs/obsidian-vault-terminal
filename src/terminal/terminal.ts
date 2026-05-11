import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';
import { ItemView, Notice, Scope, WorkspaceLeaf, getLanguage } from 'obsidian';
import { ActionRegistry } from '../actions/actionRegistry';
import { ConfigManager, flattenEnvVars } from '../config/configManager';
import { RuntimeRequiredDialog } from '../ui/dialog';
import { checkRuntimeStatus } from '../terminal/pythonRuntime';
import { ActionButton, SystemButtonCallbacks, Toolbar } from '../ui/toolbar';
import { registerLinkProvider } from './links';
import { PtyManager } from './pty';

export const TERMINAL_VIEW_TYPE = 'vault-terminal';

function shellEscape(p: string): string {
  if (process.platform === 'win32') {
    const shell = (process.env.COMSPEC ?? '').toLowerCase();
    if (shell.includes('powershell') || shell.includes('pwsh')) {
      return `'${p.replace(/'/g, "''")}'`;
    }
    return `"${p.replace(/"/g, '\\"')}"`;
  }
  return p.replace(/([ \\'"$`!#&*?|(){}<>[\];])/g, '\\$1');
}

export class TerminalView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private webglAddon: WebglAddon | null = null;
  private ptyManager: PtyManager;
  private toolbar: Toolbar | null = null;
  private terminalScope: Scope;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private configManager: ConfigManager;
  private actionRegistry: ActionRegistry;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly pluginDir: string,
    configManager: ConfigManager,
    actionRegistry: ActionRegistry,
    private readonly openRuntimeSettings: () => void,
  ) {
    super(leaf);
    this.ptyManager = new PtyManager();
    this.terminalScope = new Scope();
    this.configManager = configManager;
    this.actionRegistry = actionRegistry;
  }

  getViewType(): string {
    return TERMINAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Vault Terminal';
  }

  getIcon(): string {
    return 'terminal';
  }

  async onOpen(): Promise<void> {
    await this.configManager.load();

    const config = this.configManager.get();
    const machineRuntime = this.configManager.getMachineRuntime();
    const runtimeStatus = await checkRuntimeStatus(this.pluginDir, {
      pythonPath: machineRuntime.pythonPath,
    });
    if (!runtimeStatus.available) {
      this.showRuntimeRequiredDialog();
      return;
    }

    const container = this.contentEl;
    container.empty();
    container.addClass('vault-terminal-container');

    const toolbarEl = container.createDiv({ cls: 'vault-terminal-toolbar' });
    const callbacks: SystemButtonCallbacks = {
      onEnvClick: () => this.showEnvPopup(),
      onHistoryClick: () => this.showHistoryPopup(),
      onProfileClick: () => this.showProfilePopup(),
      onFullscreenClick: () => this.toggleFullscreen(),
      onNewWindowClick: () => this.openNewWindow(),
      onNoteToTerminal: () => this.sendNoteToTerminal(),
      onTerminalToNote: () => this.addTerminalOutputToNote(),
    };
    this.toolbar = new Toolbar(toolbarEl, this.app, callbacks);

    const actionButtons: ActionButton[] = this.configManager.getToolbarActions().map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon ?? 'terminal',
      onClick: () =>
        this.actionRegistry.execute(
          action,
          (text) => this.ptyManager.write(text),
          (a) => this.handlePassthrough(a),
        ),
    }));
    this.toolbar.setActionButtons(actionButtons);

    const xtermEl = container.createDiv({ cls: 'vault-terminal-xterm' });

    this.fitAddon = new FitAddon();
    const unicode11 = new Unicode11Addon();
    const opts = this.configManager.get().terminalOptions ?? {};
    const initConfig = this.configManager.get();
    const profile = initConfig.profiles?.[initConfig.defaultProfile ?? 'basic'];
    const obsidianBg = getComputedStyle(document.body).getPropertyValue('--background-primary').trim();
    const resolvedBg = initConfig.profiles?.[initConfig.defaultProfile ?? 'basic']?.matchObsidianBackground
      ? (obsidianBg || '#1e1e1e')
      : (profile?.theme?.background ?? '#1e1e1e');
    this.terminal = new Terminal({
      allowProposedApi: true,
      fontFamily: (opts['fontFamily'] as string | undefined) || undefined,
      fontSize: this.resolvedFontSize(),
      lineHeight: (opts['lineHeight'] as number | undefined) || 1.0,
      cursorStyle: (opts['cursorStyle'] as 'block' | 'underline' | 'bar' | undefined) || 'block',
      scrollback: (opts['scrollback'] as number | undefined) || 1000,
      theme: { ...profile?.theme, background: resolvedBg },
    });
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(unicode11);
    this.terminal.loadAddon(
      new WebLinksAddon((_e, uri) => {
        const internalPlugins = (
          this.app as unknown as { internalPlugins?: { getEnabledPluginById(id: string): unknown } }
        ).internalPlugins;
        const webviewer = internalPlugins?.getEnabledPluginById('webviewer');
        if (webviewer) {
          this.app.workspace
            .getLeaf('tab')
            .setViewState({ type: 'webviewer', active: true, state: { url: uri, navigate: true } });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('electron').shell.openExternal(uri);
        }
      }),
    );
    this.terminal.unicode.activeVersion = '11';
    this.terminal.open(xtermEl);
    xtermEl.style.background = resolvedBg;
    this.webglAddon = new WebglAddon();
    this.webglAddon.onContextLoss(() => {
      this.webglAddon?.dispose();
    });
    this.terminal.loadAddon(this.webglAddon);
    this.fitAndResizePty();

    registerLinkProvider(this.terminal, this.app, this.configManager);

    const unsubscribe = this.configManager.onChanged(() => {
      if (!this.terminal) return;
      const o = this.configManager.get().terminalOptions ?? {};
      const p = this.configManager.get().profiles?.[this.configManager.get().defaultProfile ?? 'basic'];
      this.terminal.options.fontFamily = (o['fontFamily'] as string | undefined) || undefined;
      this.terminal.options.fontSize = this.resolvedFontSize();
      this.terminal.options.lineHeight = (o['lineHeight'] as number | undefined) || 1.0;
      this.terminal.options.cursorStyle = (o['cursorStyle'] as 'block' | 'underline' | 'bar' | undefined) || 'block';
      this.terminal.options.scrollback = (o['scrollback'] as number | undefined) || 1000;
      if (p) {
        const bg = p.matchObsidianBackground
          ? (getComputedStyle(document.body).getPropertyValue('--background-primary').trim() || '#1e1e1e')
          : (p.theme.background ?? '#1e1e1e');
        this.terminal.options.theme = { ...p.theme, background: bg };
        xtermEl.style.background = bg;
      }
      this.terminal.clearTextureAtlas?.();
      this.scheduleFitAndResizePty();
    });
    this.register(unsubscribe);

    if (this.terminal.textarea) {
      this.terminal.textarea.addEventListener('focus', () =>
        this.app.keymap.pushScope(this.terminalScope),
      );
      this.terminal.textarea.addEventListener('blur', () =>
        this.app.keymap.popScope(this.terminalScope),
      );
    }

    const vaultRoot = this.configManager.getVaultRoot();
    let pty;
    try {
      pty = await this.ptyManager.spawn({
        vaultRoot,
        pluginDir: this.pluginDir,
        env: flattenEnvVars(config.env),
        locale: config.locale,
        appLocale: getLanguage(),
        pythonPath: machineRuntime.pythonPath,
        shell: this.configManager.getShell(),
        cols: this.terminal.cols,
        rows: this.terminal.rows,
      });
    } catch (error) {
      console.error('Failed to start Vault Terminal PTY', error);
      new Notice('Vault Terminal: Failed to start terminal session.');
      return;
    }

    let receivedData = false;
    pty.onData((data) => { receivedData = true; this.terminal?.write(data); });
    pty.onExit(() => {
      if (!receivedData) {
        new Notice('Vault Terminal: Terminal session ended unexpectedly.');
      }
      this.leaf.detach();
    });
    this.terminal.onData((data) => this.ptyManager.write(data));

    const onDocDragOver = (e: DragEvent) => {
      if (xtermEl.contains(e.target as Node)) e.preventDefault();
    };
    const onDocDrop = (e: DragEvent) => {
      if (!xtermEl.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      const dt = e.dataTransfer;
      if (!dt) return;

      // Obsidian 파일탐색기 드래그: text/uri-list (obsidian:// 스킴)
      const uriList = dt.getData('text/uri-list');
      if (uriList) {
        const vaultRoot = this.configManager.getVaultRoot();
        const paths = uriList
          .split(/\r?\n/)
          .filter((u) => u.startsWith('obsidian://'))
          .map((u) => {
            const file = new URL(u).searchParams.get('file');
            if (!file) return '';
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return shellEscape(
              [vaultRoot, decodeURIComponent(file)].join(require('path').sep).normalize('NFC'),
            );
          })
          .filter(Boolean)
          .join(' ');
        if (paths) {
          this.terminal?.paste(paths);
          return;
        }
      }

      // OS 파일시스템 드래그
      const files = Array.from(dt.files);
      if (files.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { webUtils } = require('electron') as { webUtils: { getPathForFile(f: File): string } };
      const paths = files
        .map((f) => shellEscape(webUtils.getPathForFile(f).normalize('NFC')))
        .join(' ');
      if (paths) this.terminal?.paste(paths);
      this.terminal?.focus();
    };
    document.addEventListener('dragover', onDocDragOver, true);
    document.addEventListener('drop', onDocDrop, true);
    this.register(() => {
      document.removeEventListener('dragover', onDocDragOver, true);
      document.removeEventListener('drop', onDocDrop, true);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleFitAndResizePty();
    });
    this.resizeObserver.observe(xtermEl);
  }

  async onClose(): Promise<void> {
    this.app.keymap.popScope(this.terminalScope);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeObserver?.disconnect();
    this.ptyManager.kill();
    this.terminal?.dispose();
  }

  sendToTerminal(text: string): void {
    this.ptyManager.write(text);
  }

  handlePassthrough(action: string): void {
    if (action === 'addTerminalOutputToNote') this.addTerminalOutputToNote();
    else if (action === 'sendSelectedTextToTerminal') this.sendNoteToTerminal();
  }

  private showRuntimeRequiredDialog(): void {
    new RuntimeRequiredDialog(this.app, this.openRuntimeSettings).open();
  }

  private scheduleFitAndResizePty(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      requestAnimationFrame(() => this.fitAndResizePty());
    }, 50);
  }

  private fitAndResizePty(): void {
    if (!this.terminal || !this.fitAddon) return;

    this.fitAddon.fit();
    this.ptyManager.resize(this.terminal.cols, this.terminal.rows);
    this.terminal.refresh(0, this.terminal.rows - 1);
  }

  private resolvedFontSize(): number {
    const cfg = this.configManager.get();
    return (cfg.terminalOptions?.['fontSize'] as number | undefined) || 12;
  }

  private showEnvPopup(): void {}
  private showHistoryPopup(): void {}
  private showProfilePopup(): void {}
  private toggleFullscreen(): void {}
  private openNewWindow(): void {}
  private sendNoteToTerminal(): void {}
  private addTerminalOutputToNote(): void {}
}
