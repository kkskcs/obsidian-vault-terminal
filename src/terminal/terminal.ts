import { FileSystemAdapter, ItemView, WorkspaceLeaf, Scope } from 'obsidian';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { PtyManager } from './pty';
import { Toolbar, SystemButtonCallbacks } from '../ui/toolbar';

export const TERMINAL_VIEW_TYPE = 'vault-terminal';

export class TerminalView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private ptyManager: PtyManager;
  private toolbar: Toolbar | null = null;
  private terminalScope: Scope;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly pluginDir: string) {
    super(leaf);
    this.ptyManager = new PtyManager();
    this.terminalScope = new Scope();
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
    const container = this.containerEl.children[1] as HTMLElement;
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
    this.toolbar.render();

    const xtermEl = container.createDiv({ cls: 'vault-terminal-xterm' });

    this.fitAddon = new FitAddon();
    const unicode11 = new Unicode11Addon();
    this.terminal = new Terminal({ allowProposedApi: true });
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(unicode11);
    this.terminal.unicode.activeVersion = '11';
    this.terminal.open(xtermEl);
    this.fitAddon.fit();

    this.terminal.textarea?.addEventListener('focus', () => this.app.keymap.pushScope(this.terminalScope));
    this.terminal.textarea?.addEventListener('blur', () => this.app.keymap.popScope(this.terminalScope));

    const vaultRoot = this.getVaultRoot();
    const pty = this.ptyManager.spawn({
      vaultRoot,
      pluginDir: this.pluginDir,
      cols: this.terminal.cols,
      rows: this.terminal.rows,
    });

    pty.onData((data) => this.terminal?.write(data));
    this.terminal.onData((data) => this.ptyManager.write(data));

    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
      this.ptyManager.resize(this.terminal?.cols ?? 80, this.terminal?.rows ?? 24);
    });
    this.resizeObserver.observe(xtermEl);
  }

  async onClose(): Promise<void> {
    this.app.keymap.popScope(this.terminalScope);
    this.resizeObserver?.disconnect();
    this.ptyManager.kill();
    this.terminal?.dispose();
  }

  private getVaultRoot(): string {
    const { adapter } = this.app.vault;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return process.cwd();
  }

  private showEnvPopup(): void {}
  private showHistoryPopup(): void {}
  private showProfilePopup(): void {}
  private toggleFullscreen(): void {}
  private openNewWindow(): void {}
  private sendNoteToTerminal(): void {}
  private addTerminalOutputToNote(): void {}
}
