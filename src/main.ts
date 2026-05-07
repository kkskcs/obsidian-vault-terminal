import { FileSystemAdapter, Plugin } from 'obsidian';
import * as path from 'path';
import { ActionRegistry } from './actions/actionRegistry';
import { ConfigManager } from './config/configManager';
import { TERMINAL_VIEW_TYPE, TerminalView } from './terminal/terminal';
import { VaultTerminalSettingTab } from './ui/settingsTab';

export default class VaultTerminalPlugin extends Plugin {
  private configManager!: ConfigManager;
  private actionRegistry!: ActionRegistry;

  async onload(): Promise<void> {
    this.configManager = new ConfigManager(this.app);
    await this.configManager.load();
    this.actionRegistry = new ActionRegistry(this.app, this.configManager);

    this.registerView(
      TERMINAL_VIEW_TYPE,
      (leaf) =>
        new TerminalView(leaf, this.getPluginDir(), this.configManager, this.actionRegistry),
    );

    this.addRibbonIcon('terminal', 'Vault Terminal', () => this.activateView());

    this.addCommand({
      id: 'open-vault-terminal',
      name: 'Open Vault Terminal',
      callback: () => this.activateView(),
    });

    this.addSettingTab(new VaultTerminalSettingTab(this.app, this, this.configManager));

    this.actionRegistry.registerCommands(
      (id, name, callback) => this.addCommand({ id, name, callback }),
      (text) => this.getActiveView()?.sendToTerminal(text),
      (action) => this.getActiveView()?.handlePassthrough(action),
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(TERMINAL_VIEW_TYPE);
  }

  private getActiveView(): TerminalView | null {
    const leaves = this.app.workspace.getLeavesOfType(TERMINAL_VIEW_TYPE);
    return leaves.length > 0 ? (leaves[0].view as TerminalView) : null;
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(TERMINAL_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: TERMINAL_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private getPluginDir(): string {
    const { adapter } = this.app.vault;
    if (adapter instanceof FileSystemAdapter) {
      return path.join(adapter.getBasePath(), '.obsidian', 'plugins', this.manifest.id);
    }
    return this.manifest.dir ?? '';
  }
}
