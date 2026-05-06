import { FileSystemAdapter, Plugin } from 'obsidian';
import * as path from 'path';
import { TERMINAL_VIEW_TYPE, TerminalView } from './terminal/terminal';

export default class VaultTerminalPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(
      TERMINAL_VIEW_TYPE,
      (leaf) => new TerminalView(leaf, this.getPluginDir()),
    );

    this.addRibbonIcon('terminal', 'Vault Terminal', () => this.activateView());

    this.addCommand({
      id: 'open-vault-terminal',
      name: 'Open Vault Terminal',
      callback: () => this.activateView(),
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(TERMINAL_VIEW_TYPE);
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
