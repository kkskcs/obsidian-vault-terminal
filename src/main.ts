import { FileSystemAdapter, Plugin, WorkspaceLeaf } from 'obsidian';
import * as path from 'path';
import { ActionRegistry } from './actions/actionRegistry';
import { ConfigManager } from './config/configManager';
import { TERMINAL_VIEW_TYPE, TerminalView } from './terminal/terminal';
import { registerCustomIcons } from './ui/iconRegistry';
import { VaultTerminalSettingTab } from './ui/settingsTab';

interface SerializedWorkspaceItem {
  id: string;
  type: 'leaf' | 'tabs' | 'split';
  direction?: 'vertical' | 'horizontal';
  currentTab?: number;
  children?: SerializedWorkspaceItem[];
}

interface TabGroupWorkspace {
  createLeafInTabGroup: (tabs?: unknown) => WorkspaceLeaf;
}

export default class VaultTerminalPlugin extends Plugin {
  private configManager!: ConfigManager;
  private actionRegistry!: ActionRegistry;
  private terminalLeafHistory: string[] = [];
  private static readonly DEFAULT_OPEN_BEHAVIOR = {
    location: 'split-down',
    pinned: true,
  } as const;

  async onload(): Promise<void> {
    const pluginDir = this.getPluginDir();
    registerCustomIcons();

    this.configManager = new ConfigManager(this.app);
    await this.configManager.load();
    this.actionRegistry = new ActionRegistry(this.app, this.configManager);

    this.registerView(
      TERMINAL_VIEW_TYPE,
      (leaf) =>
        new TerminalView(leaf, pluginDir, this.configManager, this.actionRegistry),
    );

    this.addRibbonIcon('square-terminal', 'Vault Terminal', () => this.activateView());

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
    const leaf = await this.createLeafForOpenBehavior();
    await leaf.setViewState({ type: TERMINAL_VIEW_TYPE, active: true });
    leaf.setPinned(this.configManager.get().openBehavior?.pinned ?? true);
    this.rememberTerminalLeaf(leaf);
    this.app.workspace.revealLeaf(leaf);
  }

  private async createLeafForOpenBehavior(): Promise<WorkspaceLeaf> {
    const openBehavior = {
      ...VaultTerminalPlugin.DEFAULT_OPEN_BEHAVIOR,
      ...this.configManager.get().openBehavior,
    };

    if (openBehavior.location === 'tab') {
      return this.app.workspace.getLeaf('tab');
    }

    const lastTerminalLeaf = this.getLastTerminalLeaf();
    if (lastTerminalLeaf) {
      return this.createLeafInTabGroup(lastTerminalLeaf.parent);
    }

    const activeLeaf = this.app.workspace.activeLeaf ?? this.app.workspace.getMostRecentLeaf();
    if (!activeLeaf) {
      return this.app.workspace.getLeaf('tab');
    }

    const adjacentLeaf = this.findAdjacentLeaf(activeLeaf, openBehavior.location);
    if (adjacentLeaf) {
      return this.createLeafInTabGroup(adjacentLeaf.parent);
    }

    if (openBehavior.location === 'split-right') {
      return this.app.workspace.createLeafBySplit(activeLeaf, 'vertical', false);
    }

    if (openBehavior.location === 'split-left') {
      return this.app.workspace.createLeafBySplit(activeLeaf, 'vertical', true);
    }

    if (openBehavior.location === 'split-up') {
      return this.app.workspace.createLeafBySplit(activeLeaf, 'horizontal', true);
    }

    return this.app.workspace.createLeafBySplit(activeLeaf, 'horizontal', false);
  }

  private getLastTerminalLeaf(): WorkspaceLeaf | null {
    this.terminalLeafHistory = this.terminalLeafHistory.filter((id) => {
      const leaf = this.app.workspace.getLeafById(id);
      return leaf?.getViewState().type === TERMINAL_VIEW_TYPE;
    });

    for (const id of this.terminalLeafHistory) {
      const leaf = this.app.workspace.getLeafById(id);
      if (leaf?.getViewState().type === TERMINAL_VIEW_TYPE) {
        return leaf;
      }
    }

    const existingLeaf = this.app.workspace.getLeavesOfType(TERMINAL_VIEW_TYPE)[0] ?? null;
    if (existingLeaf) {
      this.rememberTerminalLeaf(existingLeaf);
    }

    return existingLeaf;
  }

  private getLeafId(leaf: WorkspaceLeaf): string | null {
    return (leaf as WorkspaceLeaf & { id?: string }).id ?? null;
  }

  private createLeafInTabGroup(tabs: unknown): WorkspaceLeaf {
    return (this.app.workspace as unknown as TabGroupWorkspace).createLeafInTabGroup(tabs);
  }

  private rememberTerminalLeaf(leaf: WorkspaceLeaf): void {
    const id = this.getLeafId(leaf);
    if (!id) return;
    this.terminalLeafHistory = [id, ...this.terminalLeafHistory.filter((existingId) => existingId !== id)];
  }

  private findAdjacentLeaf(
    activeLeaf: WorkspaceLeaf,
    location: 'split-right' | 'split-left' | 'split-down' | 'split-up',
  ): WorkspaceLeaf | null {
    const tabs = activeLeaf.parent as unknown as {
      serialize?: () => SerializedWorkspaceItem;
      parent?: { serialize?: () => SerializedWorkspaceItem };
    };
    const tabsNode = tabs.serialize?.();
    const parentSplitNode = tabs.parent?.serialize?.();

    if (!tabsNode?.id || !parentSplitNode?.children || !parentSplitNode.direction) {
      return null;
    }

    const isVerticalMove = location === 'split-right' || location === 'split-left';
    if (
      (isVerticalMove && parentSplitNode.direction !== 'vertical')
      || (!isVerticalMove && parentSplitNode.direction !== 'horizontal')
    ) {
      return null;
    }

    const tabsIndex = parentSplitNode.children.findIndex((child) => child.id === tabsNode.id);
    if (tabsIndex === -1) {
      return null;
    }

    const siblingIndex = location === 'split-left' || location === 'split-up' ? tabsIndex - 1 : tabsIndex + 1;
    const sibling = parentSplitNode.children[siblingIndex];
    if (!sibling) {
      return null;
    }

    const targetLeafId = this.findPreferredLeafId(sibling);
    if (!targetLeafId) {
      return null;
    }

    return this.app.workspace.getLeafById(targetLeafId);
  }

  private findPreferredLeafId(node: SerializedWorkspaceItem): string | null {
    if (node.type === 'leaf') {
      return node.id;
    }

    if (!node.children || node.children.length === 0) {
      return null;
    }

    if (node.type === 'tabs') {
      const currentIndex = node.currentTab ?? 0;
      const currentChild = node.children[currentIndex] ?? node.children[0];
      return currentChild ? this.findPreferredLeafId(currentChild) : null;
    }

    for (const child of node.children) {
      const leafId = this.findPreferredLeafId(child);
      if (leafId) return leafId;
    }

    return null;
  }

  private getPluginDir(): string {
    const { adapter } = this.app.vault;
    if (adapter instanceof FileSystemAdapter) {
      return path.join(adapter.getBasePath(), '.obsidian', 'plugins', this.manifest.id);
    }
    return this.manifest.dir ?? '';
  }
}
