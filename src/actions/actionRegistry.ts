import { App } from 'obsidian';
import { ActionDef, ActionParam, ConfigManager } from '../config/configManager';
import { TemplateEngine } from './templateEngine';
import { ScriptRunner } from './scriptRunner';
import { ParamDialog } from '../ui/dialog';

interface ActionContext {
  currentFile?: string;
  selectedText?: string;
}

type SendFn = (text: string) => void;
type PassthroughFn = (action: string) => void;

export class ActionRegistry {
  private templateEngine = new TemplateEngine();
  private scriptRunner = new ScriptRunner();

  constructor(
    private readonly app: App,
    private readonly config: ConfigManager,
  ) {}

  registerCommands(
    addCommand: (id: string, name: string, callback: () => void) => void,
    send: SendFn,
    passthrough: PassthroughFn,
  ): void {
    for (const action of this.config.getActions()) {
      addCommand(
        `vault-terminal:${action.id}`,
        `Vault Terminal: ${action.label}`,
        () => this.execute(action, send, passthrough),
      );
    }
  }

  execute(action: ActionDef, send: SendFn, passthrough: PassthroughFn): void {
    if (action.mode === 'passthrough' && action.action) {
      passthrough(action.action);
      return;
    }

    const params = action.params ?? [];
    const prefill = this.resolvePrefill(params);
    const needsDialog = params.some(
      (p) => !p.useSelectedText && !p.useCurrentContext && prefill[p.name] === undefined,
    );

    if (needsDialog) {
      new ParamDialog(this.app, params, prefill, (filled) => {
        this.dispatch(action, { ...prefill, ...filled }, send);
      }).open();
    } else {
      this.dispatch(action, prefill, send);
    }
  }

  private dispatch(action: ActionDef, params: Record<string, string>, send: SendFn): void {
    switch (action.mode) {
      case 'template':
        if (action.command) {
          send(this.templateEngine.render(action.command, params) + '\n');
        }
        break;

      case 'script': {
        if (!action.script) break;
        const vaultRoot = this.config.getVaultRoot();
        const scriptFolder = this.config.getScriptFolder();
        const scriptPath = `${vaultRoot}/${scriptFolder}/${action.script}`;
        const args = (action.params ?? []).map((p) => params[p.name] ?? '');
        this.scriptRunner
          .run(scriptPath, args, vaultRoot)
          .then((out) => send(out))
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            send(`\r\nScript error: ${msg}\r\n`);
          });
        break;
      }

      case 'uri':
        if (action.command) {
          const uri = this.templateEngine.render(action.command, params);
          window.open(uri);
        }
        break;

      case 'context':
        if (action.command) {
          send(this.templateEngine.render(action.command, params) + '\n');
        }
        break;
    }
  }

  private resolvePrefill(params: ActionParam[]): Record<string, string> {
    const result: Record<string, string> = {};
    const activeFile = this.app.workspace.getActiveFile();
    const editor = this.app.workspace.activeEditor?.editor;

    for (const param of params) {
      if (param.useSelectedText && editor) {
        const selected = editor.getSelection();
        if (selected) result[param.name] = selected;
      } else if (param.useCurrentContext && activeFile) {
        result[param.name] = activeFile.path;
      } else if (param.default !== undefined) {
        result[param.name] = param.default;
      }
    }

    return result;
  }
}
