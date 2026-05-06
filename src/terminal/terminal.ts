import { App, FileSystemAdapter, ItemView, WorkspaceLeaf, Scope } from 'obsidian';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { PtyManager } from './pty';
import { Toolbar, ActionButton, SystemButtonCallbacks } from '../ui/toolbar';
import { ConfigManager } from '../config/configManager';
import { ActionRegistry } from '../actions/actionRegistry';
import { registerLinkProvider } from './links';

export const TERMINAL_VIEW_TYPE = 'vault-terminal';

export class TerminalView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
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
      onClick: () => this.actionRegistry.execute(action, (text) => this.ptyManager.write(text), (a) => this.handlePassthrough(a)),
    }));
    this.toolbar.setActionButtons(actionButtons);

    const xtermEl = container.createDiv({ cls: 'vault-terminal-xterm' });

    this.fitAddon = new FitAddon();
    const unicode11 = new Unicode11Addon();
    this.terminal = new Terminal({ allowProposedApi: true });
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(unicode11);
    this.terminal.loadAddon(new WebLinksAddon((_e, uri) => {
      const internalPlugins = (this.app as unknown as { internalPlugins?: { getEnabledPluginById(id: string): unknown } }).internalPlugins;
      const webviewer = internalPlugins?.getEnabledPluginById('webviewer');
      if (webviewer) {
        this.app.workspace.getLeaf('tab').setViewState({ type: 'webviewer', active: true, state: { url: uri, navigate: true } });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('electron').shell.openExternal(uri);
      }
    }));
    this.terminal.unicode.activeVersion = '11';
    this.terminal.open(xtermEl);
    this.fitAddon.fit();

    registerLinkProvider(this.terminal, this.app);

    if (this.terminal.textarea) {
      this.terminal.textarea.addEventListener('focus', () => this.app.keymap.pushScope(this.terminalScope));
      this.terminal.textarea.addEventListener('blur', () => this.app.keymap.popScope(this.terminalScope));
    }

    const vaultRoot = this.configManager.getVaultRoot();
    const pty = this.ptyManager.spawn({
      vaultRoot,
      pluginDir: this.pluginDir,
      env: this.configManager.get().env ?? {},
      cols: this.terminal.cols,
      rows: this.terminal.rows,
    });

    pty.onData((data) => this.terminal?.write(data));
    this.terminal.onData((data) => this.ptyManager.write(data));

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.fitAddon?.fit();
        this.ptyManager.resize(this.terminal?.cols ?? 80, this.terminal?.rows ?? 24);
      }, 50);
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

  private showEnvPopup(): void {}
  private showHistoryPopup(): void {}
  private showProfilePopup(): void {}
  private toggleFullscreen(): void {}
  private openNewWindow(): void {}
  private sendNoteToTerminal(): void {}
  private addTerminalOutputToNote(): void {}
}
