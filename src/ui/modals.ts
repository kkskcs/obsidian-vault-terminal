import { App, Modal, Notice, Setting } from 'obsidian';

export class EnvVarModal extends Modal {
  private key: string;
  private value: string;
  private submitted = false;

  constructor(
    app: App,
    private readonly onSubmit: (key: string, value: string) => Promise<void>,
    private readonly afterClose?: () => void,
    initialKey = '',
    initialValue = '',
  ) {
    super(app);
    this.key = initialKey;
    this.value = initialValue;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Environment Variable' });

    new Setting(contentEl)
      .setName('Key')
      .addText((t) =>
        t.setValue(this.key).onChange((v) => {
          this.key = v;
        }),
      );

    new Setting(contentEl)
      .setName('Value')
      .addText((t) =>
        t.setValue(this.value).onChange((v) => {
          this.value = v;
        }),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText('Confirm')
          .setCta()
          .onClick(async () => {
            await this.onSubmit(this.key, this.value);
            this.submitted = true;
            this.close();
          }),
      )
      .addButton((b) =>
        b.setButtonText('Cancel').onClick(() => {
          this.close();
        }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.submitted) requestAnimationFrame(() => requestAnimationFrame(() => this.afterClose?.()));
  }
}

export class ProfileNameModal extends Modal {
  private name: string = '';
  private submitted = false;

  constructor(
    app: App,
    private readonly existingNames: Set<string>,
    private readonly onSubmit: (name: string) => Promise<void>,
    private readonly afterClose?: () => void,
    initialName = '',
  ) {
    super(app);
    this.name = initialName;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: this.name ? 'Rename Profile' : 'New Profile Name' });

    new Setting(contentEl)
      .setName('Name')
      .addText((t) =>
        t.setValue(this.name).onChange((v) => {
          this.name = v;
        }),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText('Confirm')
          .setCta()
          .onClick(async () => {
            if (!this.name.trim()) {
              new Notice('Profile name cannot be empty.');
              return;
            }
            if (this.existingNames.has(this.name.trim())) {
              new Notice(`Profile "${this.name.trim()}" already exists.`);
              return;
            }
            await this.onSubmit(this.name.trim());
            this.submitted = true;
            this.close();
          }),
      )
      .addButton((b) =>
        b.setButtonText('Cancel').onClick(() => {
          this.close();
        }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.submitted) requestAnimationFrame(() => requestAnimationFrame(() => this.afterClose?.()));
  }
}
