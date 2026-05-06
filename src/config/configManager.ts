import { App, FileSystemAdapter, TFile } from 'obsidian';

export interface ActionParam {
  name: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'choice';
  required?: boolean;
  useSelectedText?: boolean;
  useCurrentContext?: boolean;
  default?: string;
  choices?: string[];
}

export type ActionMode = 'template' | 'script' | 'uri' | 'context' | 'passthrough';
export type PassthroughAction = 'addTerminalOutputToNote' | 'sendSelectedTextToTerminal';
export type ContextType = 'currentFile' | 'currentTag' | 'vaultPath';

export interface ActionDef {
  id: string;
  label: string;
  icon?: string;
  mode: ActionMode;
  description?: string;
  command?: string;
  script?: string;
  workingDir?: string;
  contextType?: ContextType;
  action?: PassthroughAction;
  params?: ActionParam[];
}

export interface ProfileTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
}

export interface Profile {
  theme: ProfileTheme;
}

export interface HistoryConfig {
  mode: 'none' | 'note' | 'daily';
  folder?: string;
  note?: string;
  maxEntries?: number;
}

export interface AddToNoteConfig {
  lines: number;
  askLines: boolean;
}

export interface VaultTerminalConfig {
  version?: string;
  vaultRoot?: boolean;
  scriptFolder?: string;
  terminalOptions?: Record<string, unknown>;
  profiles?: Record<string, Profile>;
  defaultProfile?: string;
  env?: Record<string, string>;
  addToNote?: AddToNoteConfig;
  history?: HistoryConfig;
  actions?: ActionDef[];
  toolbar?: string[];
  ruleSets?: Array<{ id: string; label: string; actions: string[] }>;
  pathPatterns?: { enabled: boolean; patterns: Array<{ name: string; regex: string }> };
}

const CONFIG_PATH = '.vault-terminal/config.json';

const DEFAULT_CONFIG: VaultTerminalConfig = {
  version: '1.0.0',
  vaultRoot: true,
  scriptFolder: '.vault-terminal/scripts',
  terminalOptions: { fontSize: 14, scrollback: 1000 },
  profiles: {
    default: {
      theme: { background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4' },
    },
  },
  defaultProfile: 'default',
  env: {},
  addToNote: { lines: 200, askLines: true },
  history: { mode: 'none' },
  actions: [],
  toolbar: [],
  pathPatterns: {
    enabled: true,
    patterns: [
      { name: 'relative', regex: '\\.\\/.+(\\.\\w+)?' },
      { name: 'filename', regex: '[\\w\\-. ]+\\.(md|txt|yaml|json|sh)' },
    ],
  },
};

export class ConfigManager {
  private config: VaultTerminalConfig = { ...DEFAULT_CONFIG };

  constructor(private readonly app: App) {}

  async load(): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(CONFIG_PATH);
      if (!(file instanceof TFile)) {
        await this.createDefault();
        return;
      }
      const raw = await this.app.vault.read(file);
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  get(): Readonly<VaultTerminalConfig> {
    return this.config;
  }

  getActions(): ActionDef[] {
    return this.config.actions ?? [];
  }

  getToolbarActionIds(): string[] {
    return this.config.toolbar ?? [];
  }

  getToolbarActions(): ActionDef[] {
    const actions = this.getActions();
    return this.getToolbarActionIds()
      .map((id) => actions.find((a) => a.id === id))
      .filter((a): a is ActionDef => a !== undefined);
  }

  getVaultRoot(): string {
    const { adapter } = this.app.vault;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return process.cwd();
  }

  getScriptFolder(): string {
    return this.config.scriptFolder ?? '.vault-terminal/scripts';
  }

  private async createDefault(): Promise<void> {
    const dir = '.vault-terminal';
    if (!this.app.vault.getAbstractFileByPath(dir)) {
      await this.app.vault.createFolder(dir);
    }
    await this.app.vault.create(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}
