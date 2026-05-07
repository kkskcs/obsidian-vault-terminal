import { App, Modal } from 'obsidian';
import { ActionParam } from '../config/configManager';
import { openExternalUrl, RUNTIME_SETUP_URL } from './links';

export class ParamDialog extends Modal {
  private result: Record<string, string> = {};
  private onSubmit: (params: Record<string, string>) => void;
  private params: ActionParam[];

  constructor(
    app: App,
    params: ActionParam[],
    prefill: Record<string, string>,
    onSubmit: (params: Record<string, string>) => void,
  ) {
    super(app);
    this.params = params;
    this.result = { ...prefill };
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    for (const param of this.params) {
      const row = contentEl.createDiv({ cls: 'vault-terminal-dialog-row' });

      if (this.result[param.name] !== undefined) {
        row.createEl('label', { text: param.name, cls: 'vault-terminal-dialog-label' });
        const input = row.createEl('input', {
          type: 'text',
          cls: 'vault-terminal-dialog-input',
        });
        input.value = this.result[param.name];
        input.disabled = true;
        continue;
      }

      row.createEl('label', { text: param.name, cls: 'vault-terminal-dialog-label' });

      if (param.type === 'choice' && param.choices?.length) {
        const select = row.createEl('select', { cls: 'vault-terminal-dialog-input' });
        for (const choice of param.choices) {
          const opt = select.createEl('option', { value: choice, text: choice });
          if (param.default === choice) opt.selected = true;
        }
        this.result[param.name] = param.choices[0];
        select.addEventListener('change', () => {
          this.result = { ...this.result, [param.name]: select.value };
        });
      } else {
        const input = row.createEl('input', {
          type: 'text',
          cls: 'vault-terminal-dialog-input',
          placeholder: param.placeholder ?? '',
        });
        if (param.default) input.value = param.default;
        input.addEventListener('input', () => {
          this.result = { ...this.result, [param.name]: input.value };
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.submit();
        });
      }
    }

    const btnRow = contentEl.createDiv({ cls: 'vault-terminal-dialog-buttons' });
    btnRow.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
    okBtn.addEventListener('click', () => this.submit());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private submit(): void {
    this.close();
    this.onSubmit(this.result);
  }
}

export class RuntimeRequiredDialog extends Modal {
  constructor(
    app: App,
    private readonly onOpenRuntimeSettings: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Vault Terminal Runtime Required' });
    contentEl.createEl('p', {
      text: 'Vault Terminal needs a Python runtime before it can start a terminal session. Open Runtime settings to check the current status and setup options.',
    });
    contentEl.createEl('p').createEl('a', {
      text: 'README runtime setup guide',
      href: RUNTIME_SETUP_URL,
    }).addEventListener('click', (event) => {
      event.preventDefault();
      openExternalUrl(RUNTIME_SETUP_URL);
    });

    const btnRow = contentEl.createDiv({ cls: 'vault-terminal-dialog-buttons' });
    btnRow.createEl('button', { text: 'OK' }).addEventListener('click', () => this.close());
    const settingsBtn = btnRow.createEl('button', { text: 'Open Runtime Settings', cls: 'mod-cta' });
    settingsBtn.addEventListener('click', () => {
      this.close();
      this.onOpenRuntimeSettings();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
