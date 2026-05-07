import { App, Notice, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type VaultTerminalPlugin from '../main';
import { ConfigManager, LOCALE_OPTIONS, PREDEFINED_PROFILES, ProfileTheme } from '../config/configManager';
import { getSystemFonts } from '../utils/fonts';
import { EnvVarModal, ProfileNameModal } from './modals';

type TabId = 'general' | 'profile' | 'toolbar';


const ANSI_COLORS: Array<{ key: keyof ProfileTheme; label: string }> = [
  { key: 'black', label: 'Black' },
  { key: 'red', label: 'Red' },
  { key: 'green', label: 'Green' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'blue', label: 'Blue' },
  { key: 'magenta', label: 'Magenta' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'white', label: 'White' },
  { key: 'brightBlack', label: 'Bright Black' },
  { key: 'brightRed', label: 'Bright Red' },
  { key: 'brightGreen', label: 'Bright Green' },
  { key: 'brightYellow', label: 'Bright Yellow' },
  { key: 'brightBlue', label: 'Bright Blue' },
  { key: 'brightMagenta', label: 'Bright Magenta' },
  { key: 'brightCyan', label: 'Bright Cyan' },
  { key: 'brightWhite', label: 'Bright White' },
];

export class VaultTerminalSettingTab extends PluginSettingTab {
  private activeTab: TabId = 'general';

  constructor(
    app: App,
    plugin: VaultTerminalPlugin,
    private readonly configManager: ConfigManager,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.renderTabNav(containerEl);

    const body = containerEl.createDiv({ cls: 'vault-terminal-settings-body' });
    if (this.activeTab === 'general') this.renderGeneralTab(body);
    else if (this.activeTab === 'profile') this.renderProfileTab(body);
    else this.renderToolbarTab(body);
  }

  private renderTabNav(container: HTMLElement): void {
    const nav = container.createDiv({ cls: 'vault-terminal-settings-nav' });
    const tabs: { id: TabId; label: string }[] = [
      { id: 'general', label: 'General' },
      { id: 'profile', label: 'Profile' },
      { id: 'toolbar', label: 'Toolbar' },
    ];
    for (const tab of tabs) {
      const cls = ['vault-terminal-settings-tab'];
      if (this.activeTab === tab.id) cls.push('is-active');
      const btn = nav.createEl('button', { text: tab.label, cls: cls.join(' ') });
      btn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.display();
      });
    }
  }

  // ──────────────────────────────────────────────
  // General Tab
  // ──────────────────────────────────────────────

  private renderGeneralTab(container: HTMLElement): void {
    this.renderTerminalOptions(container);
    this.renderHistorySection(container);
    this.renderAddToNoteSection(container);
    this.renderEnvSection(container);
  }

  private renderTerminalOptions(container: HTMLElement): void {
    container.createEl('h3', { text: 'Terminal Options' });

    const opts = (this.configManager.get().terminalOptions ?? {}) as Record<string, unknown>;

    new Setting(container)
      .setName('Locale')
      .setDesc('Language and encoding for the terminal shell session.')
      .addDropdown((dd) => {
        dd.addOptions(LOCALE_OPTIONS);
        dd.setValue(this.configManager.get().locale ?? 'system').onChange(async (v) => {
          this.configManager.update({ locale: v as import('../config/configManager').LocaleSetting });
          await this.configManager.save();
        });
        return dd;
      });

    new Setting(container)
      .setName('Font')
      .setDesc('Monospace font for the terminal.')
      .addDropdown((dd) => {
        dd.addOption('', '⚙ System default');
        dd.setValue(String(opts['fontFamily'] ?? '')).onChange(async (v) => {
          this.configManager.update({ terminalOptions: { ...this.configManager.get().terminalOptions, fontFamily: v } });
          await this.configManager.save();
        });
        getSystemFonts().then((fonts) => {
          for (const font of fonts) dd.addOption(font, font);
          dd.setValue(String(opts['fontFamily'] ?? ''));
        });
        return dd;
      });

    new Setting(container)
      .setName('Font size')
      .setDesc('Font size in pixels.')
      .addText((t) =>
        t
          .setPlaceholder('12')
          .setValue(String(opts['fontSize'] ?? ''))
          .onChange(async (v) => {
            this.configManager.update({ terminalOptions: { ...this.configManager.get().terminalOptions, fontSize: parseInt(v) || undefined } });
            await this.configManager.save();
          }),
      );

    new Setting(container)
      .setName('Line height')
      .setDesc('Line height multiplier.')
      .addText((t) =>
        t
          .setPlaceholder('1.0')
          .setValue(String(opts['lineHeight'] ?? ''))
          .onChange(async (v) => {
            this.configManager.update({ terminalOptions: { ...this.configManager.get().terminalOptions, lineHeight: parseFloat(v) || undefined } });
            await this.configManager.save();
          }),
      );

    new Setting(container)
      .setName('Cursor style')
      .addDropdown((dd) =>
        dd
          .addOptions({ block: 'Block', underline: 'Underline', bar: 'Bar' })
          .setValue(String(opts['cursorStyle'] ?? 'block'))
          .onChange(async (v) => {
            this.configManager.update({ terminalOptions: { ...this.configManager.get().terminalOptions, cursorStyle: v } });
            await this.configManager.save();
          }),
      );

    new Setting(container)
      .setName('Scrollback')
      .setDesc('Number of lines to retain in scrollback buffer.')
      .addText((t) =>
        t
          .setPlaceholder('1000')
          .setValue(String(opts['scrollback'] ?? ''))
          .onChange(async (v) => {
            this.configManager.update({ terminalOptions: { ...this.configManager.get().terminalOptions, scrollback: parseInt(v) || undefined } });
            await this.configManager.save();
          }),
      );
  }

  private renderEnvSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Environment Variables' });

    container.createEl('p', {
      text: 'Built-in (read-only)',
      cls: 'vault-terminal-settings-section-label',
    });

    const builtinVars = [
      { key: 'VAULT_ROOT', desc: 'Absolute path to the vault root directory' },
      { key: 'OBSIDIAN_PLUGIN_DIR', desc: 'Absolute path to this plugin directory' },
    ];
    for (const { key, desc } of builtinVars) {
      new Setting(container)
        .setName(key)
        .setDesc(desc);
    }

    container.createEl('p', {
      text: 'Custom',
      cls: 'vault-terminal-settings-section-label',
    });

    const env = this.configManager.get().env ?? {};
    const entries = Object.entries(env);

    if (entries.length === 0) {
      container.createEl('p', {
        text: 'No environment variables defined.',
        cls: 'vault-terminal-settings-empty',
      });
    }

    for (const [key, value] of entries) {
      const s = new Setting(container).setName(key);
      const sep = s.nameEl.createEl('span', { text: ' = ' });
      sep.style.cssText = 'color:var(--text-faint);font-family:monospace;';
      const valEl = s.nameEl.createEl('span', { text: value });
      valEl.style.cssText = 'color:var(--text-muted);font-family:monospace;font-weight:normal;';
      s.addExtraButton((b) =>
          b.setIcon('pencil').setTooltip('Edit').onClick(() => {
            new EnvVarModal(
              this.app,
              async (newKey, newValue) => {
                const newEnv = { ...this.configManager.get().env };
                delete newEnv[key];
                newEnv[newKey] = newValue;
                this.configManager.update({ env: newEnv });
                await this.configManager.save();
              },
              () => this.display(),
              key,
              value,
            ).open();
          }),
        )
        .addExtraButton((b) =>
          b.setIcon('trash').setTooltip('Delete').onClick(async () => {
            const newEnv = { ...this.configManager.get().env };
            delete newEnv[key];
            this.configManager.update({ env: newEnv });
            await this.configManager.save();
            this.display();
          }),
        );
    }

    new Setting(container).addButton((b) =>
      b
        .setButtonText('Add variable')
        .setCta()
        .onClick(() => {
          new EnvVarModal(this.app, async (newKey, newValue) => {
            const newEnv = { ...this.configManager.get().env, [newKey]: newValue };
            this.configManager.update({ env: newEnv });
            await this.configManager.save();
          }, () => this.display()).open();
        }),
    );
  }

  private renderHistorySection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Input History' });

    const history = this.configManager.get().history ?? { mode: 'none' };

    new Setting(container)
      .setName('Storage mode')
      .setDesc('Where to persist terminal input history.')
      .addDropdown((dd) =>
        dd
          .addOptions({ none: 'None (volatile)', note: 'Single note', daily: 'Daily notes' })
          .setValue(history.mode)
          .onChange(() => {}),
      );

    new Setting(container)
      .setName('Folder / Note path')
      .setDesc('Path relative to vault root. Used when mode is "note" or "daily".')
      .addText((t) =>
        t
          .setPlaceholder('.vault-terminal/history')
          .setValue(history.folder ?? history.note ?? '')
          .onChange(() => {}),
      );

    new Setting(container)
      .setName('Max entries')
      .setDesc('Maximum entries to keep in single note mode.')
      .addText((t) =>
        t
          .setPlaceholder('1000')
          .setValue(history.maxEntries?.toString() ?? '')
          .onChange(() => {}),
      );
  }

  private renderAddToNoteSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Add to Note' });

    const cfg = this.configManager.get().addToNote ?? { lines: 200, askLines: true };

    new Setting(container)
      .setName('Default lines')
      .setDesc('Number of terminal output lines to capture.')
      .addText((t) =>
        t
          .setPlaceholder('200')
          .setValue(cfg.lines.toString())
          .onChange(async (v) => {
            const lines = parseInt(v) || 200;
            this.configManager.update({ addToNote: { ...cfg, lines } });
            await this.configManager.save();
          }),
      );

    new Setting(container)
      .setName('Ask lines on capture')
      .setDesc('Show a dialog to confirm or change the line count each time.')
      .addToggle((toggle) =>
        toggle.setValue(cfg.askLines).onChange(async (v) => {
          this.configManager.update({ addToNote: { ...cfg, askLines: v } });
          await this.configManager.save();
        }),
      );
  }

  // ──────────────────────────────────────────────
  // Profile Tab
  // ──────────────────────────────────────────────

  private renderProfileTab(container: HTMLElement): void {
    const config = this.configManager.get();
    const profiles = config.profiles ?? {};
    const profileNames = Object.keys(profiles);

    new Setting(container)
      .setName('Default profile')
      .setDesc('Profile applied when opening a new terminal.')
      .addDropdown((dd) => {
        for (const name of profileNames) dd.addOption(name, name);
        dd.setValue(config.defaultProfile ?? 'basic').onChange(async (v) => {
          this.configManager.update({ defaultProfile: v });
          await this.configManager.save();
          this.display();
        });
      });

    const existingNames = new Set(profileNames);
    const presetKeys = Object.keys(PREDEFINED_PROFILES);
    const presetOptions: Record<string, string> = {};
    for (const n of presetKeys) presetOptions[n] = n;

    let selectedPreset = presetKeys[0] ?? '';
    const addProfileSetting = new Setting(container)
      .setName('Add profile')
      .setDesc('Copy a built-in preset as a new profile.');

    let presetBgFgEl: HTMLElement;
    let presetPaletteEl: HTMLElement;

    const PALETTE_KEYS: Array<keyof ProfileTheme> = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    ];

    const initTheme = PREDEFINED_PROFILES[selectedPreset]?.theme ?? {} as ProfileTheme;
    presetBgFgEl = addProfileSetting.controlEl.appendChild(this.buildBgFgSwatch(initTheme));
    presetPaletteEl = addProfileSetting.controlEl.appendChild(this.buildPaletteSwatch(initTheme));
    presetPaletteEl.style.marginRight = '6px';

    addProfileSetting.controlEl.createEl('span', {
      text: 'preset',
      cls: 'vault-terminal-settings-inline-label',
    });

    addProfileSetting
      .addDropdown((dd) => {
        dd.addOptions(presetOptions);
        dd.setValue(selectedPreset).onChange((v) => {
          selectedPreset = v;
          const t = PREDEFINED_PROFILES[v]?.theme;
          if (t) {
            presetBgFgEl.style.background = t.background ?? '#1e1e1e';
            presetBgFgEl.style.color = t.foreground ?? '#d4d4d4';
            const cells = presetPaletteEl.querySelectorAll('span');
            cells.forEach((cell, i) => {
              (cell as HTMLElement).style.background = (t[PALETTE_KEYS[i]] as string | undefined) ?? '#888';
            });
          }
        });
        return dd;
      });

    addProfileSetting.addExtraButton((b) =>
      b.setIcon('plus').setTooltip('Add').onClick(() => {
        const suggestedName = this.uniqueProfileName(selectedPreset, existingNames);
        new ProfileNameModal(this.app, existingNames, async (name) => {
          const newProfiles = {
            ...this.configManager.get().profiles,
            [name]: { theme: PREDEFINED_PROFILES[selectedPreset].theme },
          };
          this.configManager.update({ profiles: newProfiles });
          await this.configManager.save();
        }, () => this.display(), suggestedName).open();
      }),
    );

    new Setting(container)
      .setName('Reset all profiles')
      .setDesc('Restore all profiles to defaults and remove custom ones.')
      .addButton((b) =>
        b.setButtonText('Reset').setWarning().onClick(async () => {
          if (!confirm('Reset all profiles to defaults? Custom profiles will be deleted.')) return;
          this.configManager.update({
            profiles: { basic: PREDEFINED_PROFILES['basic'] },
            defaultProfile: 'basic',
          });
          await this.configManager.save();
          new Notice('Profiles reset to defaults.');
          this.display();
        }),
      );

    container.createEl('hr', { cls: 'vault-terminal-settings-hr' });
    container.createEl('p', { text: `Profiles (${profileNames.length})`, cls: 'vault-terminal-settings-section-label' });

    for (const name of profileNames) {
      const theme = profiles[name].theme;
      const isDefault = name === (config.defaultProfile ?? 'basic');
      const setting = new Setting(container).setName(`${name}`);
      const starEl = document.createElement('span');
      starEl.textContent = isDefault ? '★ ' : '☆ ';
      starEl.style.color = isDefault ? 'var(--color-yellow)' : 'var(--text-faint)';

      const bgFgEl = this.buildBgFgSwatch(theme);
      const paletteEl = this.buildPaletteSwatch(theme);

      // 순서: star → Aa → palette → name text (bold)
      setting.nameEl.style.fontWeight = 'normal';
      const nameText = setting.nameEl.childNodes[0];
      if (nameText) {
        const bold = document.createElement('span');
        bold.style.fontWeight = '600';
        bold.style.marginLeft = '10px';
        bold.textContent = name;
        setting.nameEl.replaceChild(bold, nameText);
      }
      setting.nameEl.prepend(paletteEl);
      setting.nameEl.prepend(bgFgEl);
      setting.nameEl.prepend(starEl);

      const idx = profileNames.indexOf(name);
      setting
        .addExtraButton((b) => {
          b.setIcon('arrow-up').setTooltip('Move up');
          if (idx === 0) b.setDisabled(true);
          else b.onClick(async () => {
            const cfg = this.configManager.get();
            const names = Object.keys(cfg.profiles ?? {});
            const i = names.indexOf(name);
            [names[i - 1], names[i]] = [names[i], names[i - 1]];
            const reordered = Object.fromEntries(names.map((n) => [n, cfg.profiles![n]]));
            this.configManager.update({ profiles: reordered });
            await this.configManager.save();
            this.display();
          });
          return b;
        })
        .addExtraButton((b) => {
          b.setIcon('arrow-down').setTooltip('Move down');
          if (idx === profileNames.length - 1) b.setDisabled(true);
          else b.onClick(async () => {
            const cfg = this.configManager.get();
            const names = Object.keys(cfg.profiles ?? {});
            const i = names.indexOf(name);
            [names[i], names[i + 1]] = [names[i + 1], names[i]];
            const reordered = Object.fromEntries(names.map((n) => [n, cfg.profiles![n]]));
            this.configManager.update({ profiles: reordered });
            await this.configManager.save();
            this.display();
          });
          return b;
        })
        .addExtraButton((b) =>
          b.setIcon('pencil').setTooltip('Rename').onClick(() => {
            const currentNames = new Set(Object.keys(this.configManager.get().profiles ?? {}));
            currentNames.delete(name);
            new ProfileNameModal(this.app, currentNames, async (newName) => {
              const cfg = this.configManager.get();
              const updatedProfiles = { ...cfg.profiles };
              updatedProfiles[newName] = updatedProfiles[name];
              delete updatedProfiles[name];
              const toolbar = (cfg.toolbar ?? []).map((id) => id === name ? newName : id);
              this.configManager.update({
                profiles: updatedProfiles,
                defaultProfile: cfg.defaultProfile === name ? newName : cfg.defaultProfile,
                toolbar,
              });
              await this.configManager.save();
            }, () => this.display(), name).open();
          }),
        )
        .addExtraButton((b) => {
          b.setIcon('trash').setTooltip('Delete');
          if (profileNames.length <= 1) {
            b.setDisabled(true);
          } else {
            b.onClick(async () => {
              if (!confirm(`Delete profile "${name}"?`)) return;
              const newProfiles = { ...this.configManager.get().profiles };
              delete newProfiles[name];
              const currentDefault = this.configManager.get().defaultProfile;
              const newDefault = currentDefault === name ? Object.keys(newProfiles)[0] : currentDefault;
              this.configManager.update({ profiles: newProfiles, defaultProfile: newDefault });
              await this.configManager.save();
              this.display();
            });
          }
          return b;
        });

      setting.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });

      let isOpen = false;
      setting.addExtraButton((b) => {
        b.setIcon('chevron-down').setTooltip('Expand');
        b.onClick(() => {
          isOpen = !isOpen;
          const editorEl = container.querySelector(`[data-profile="${name}"]`) as HTMLElement | null;
          editorEl?.toggleClass('is-open', isOpen);
          b.setIcon(isOpen ? 'chevron-up' : 'chevron-down');
        });
        return b;
      });

      const editorEl = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
      editorEl.setAttribute('data-profile', name);
      this.renderProfileEditor(editorEl, name, theme);
    }

  }

  private buildPaletteSwatch(theme: ProfileTheme): HTMLElement {
    const PALETTE_KEYS: Array<keyof ProfileTheme> = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    ];
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-grid;grid-template-columns:repeat(8,5px);grid-template-rows:repeat(2,5px);gap:1px;margin-right:4px;vertical-align:middle;flex-shrink:0;border-radius:2px;overflow:hidden;border:1px solid rgba(128,128,128,0.3);';
    for (const key of PALETTE_KEYS) {
      const cell = document.createElement('span');
      cell.style.cssText = `display:block;width:5px;height:5px;background:${(theme[key] as string | undefined) ?? '#888'};`;
      wrap.appendChild(cell);
    }
    return wrap;
  }

  private buildBgFgSwatch(theme: ProfileTheme): HTMLElement {
    const el = document.createElement('span');
    el.textContent = 'Aa';
    el.style.cssText = `background:${theme.background ?? '#1e1e1e'};color:${theme.foreground ?? '#d4d4d4'};display:inline-flex;align-items:center;justify-content:center;width:28px;height:14px;border-radius:3px;border:1px solid rgba(128,128,128,0.3);margin-right:6px;vertical-align:middle;flex-shrink:0;font-size:10px;font-family:monospace;line-height:1;`;
    return el;
  }

  private uniqueProfileName(base: string, existing: Set<string>): string {
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }

  private findSwatch(container: HTMLElement, name: string): HTMLElement | null {
    return container
      .closest('.vault-terminal-settings-body')
      ?.querySelector(`[data-profile="${name}"]`)
      ?.previousElementSibling
      ?.querySelector('.vault-terminal-profile-swatch') as HTMLElement | null ?? null;
  }

  private renderProfileEditor(container: HTMLElement, name: string, theme: ProfileTheme): void {
    const profileData = (this.configManager.get().profiles ?? {})[name];

    new Setting(container)
      .setName('Match Obsidian background')
      .setDesc('Use the current Obsidian theme background color instead of the profile color.')
      .addToggle((toggle) =>
        toggle.setValue(profileData?.matchObsidianBackground ?? false).onChange(async (v) => {
          const profiles = this.configManager.get().profiles ?? {};
          this.configManager.update({
            profiles: { ...profiles, [name]: { ...profiles[name], matchObsidianBackground: v } },
          });
          await this.configManager.save();
        }),
      );

    // Base colors
    container.createEl('p', { text: 'Base', cls: 'vault-terminal-settings-section-label' });

    new Setting(container)
      .setName('Background')
      .addColorPicker((cp) =>
        cp.setValue(theme.background ?? '#1e1e1e').onChange(async (v) => {
          const profiles = this.configManager.get().profiles ?? {};
          this.configManager.update({
            profiles: { ...profiles, [name]: { ...profiles[name], theme: { ...profiles[name].theme, background: v } } },
          });
          await this.configManager.save();
          const swatch = this.findSwatch(container, name);
          if (swatch) swatch.style.backgroundColor = v;
        }),
      );

    new Setting(container)
      .setName('Foreground')
      .addColorPicker((cp) =>
        cp.setValue(theme.foreground ?? '#d4d4d4').onChange(async (v) => {
          const profiles = this.configManager.get().profiles ?? {};
          this.configManager.update({
            profiles: { ...profiles, [name]: { ...profiles[name], theme: { ...profiles[name].theme, foreground: v } } },
          });
          await this.configManager.save();
          const swatch = this.findSwatch(container, name);
          if (swatch) swatch.style.color = v;
        }),
      );

    new Setting(container)
      .setName('Cursor')
      .addColorPicker((cp) =>
        cp.setValue(theme.cursor ?? '#d4d4d4').onChange(async (v) => {
          const profiles = this.configManager.get().profiles ?? {};
          this.configManager.update({
            profiles: { ...profiles, [name]: { ...profiles[name], theme: { ...profiles[name].theme, cursor: v } } },
          });
          await this.configManager.save();
        }),
      );

    // ANSI palette
    container.createEl('p', { text: 'ANSI Palette', cls: 'vault-terminal-settings-section-label' });

    const grid = container.createDiv({ cls: 'vault-terminal-ansi-grid' });
    for (const { key, label } of ANSI_COLORS) {
      const cell = grid.createDiv({ cls: 'vault-terminal-ansi-cell' });
      cell.createSpan({ text: label, cls: 'vault-terminal-ansi-label' });
      const picker = cell.createEl('input', { type: 'color', cls: 'vault-terminal-ansi-picker' });
      picker.value = (theme[key] as string | undefined) ?? '#000000';
      picker.addEventListener('change', async () => {
        const profiles = this.configManager.get().profiles ?? {};
        this.configManager.update({
          profiles: { ...profiles, [name]: { ...profiles[name], theme: { ...profiles[name]?.theme, [key]: picker.value } } },
        });
        await this.configManager.save();
      });
    }

  }

  // ──────────────────────────────────────────────
  // Toolbar Tab
  // ──────────────────────────────────────────────

  private renderToolbarTab(container: HTMLElement): void {
    this.renderActionsSection(container);
    this.renderToolbarOrderSection(container);
  }

  private renderActionsSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Actions' });

    const actions = this.configManager.get().actions ?? [];

    if (actions.length === 0) {
      container.createEl('p', {
        text: 'No actions defined.',
        cls: 'vault-terminal-settings-empty',
      });
    }

    for (const action of actions) {
      new Setting(container)
        .setName(action.label)
        .setDesc(`${action.mode}${action.command ? ` · ${action.command}` : ''}`)
        .addExtraButton((b) => b.setIcon('pencil').setTooltip('Edit').onClick(() => {}))
        .addExtraButton((b) => b.setIcon('trash').setTooltip('Delete').onClick(() => {}));
    }

    new Setting(container).addButton((b) =>
      b
        .setButtonText('Add action')
        .setCta()
        .onClick(() => {}),
    );
  }

  private renderToolbarOrderSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Toolbar Order' });
    container.createEl('p', {
      text: 'Actions shown in the toolbar, in order. Toggle visibility or reorder.',
      cls: 'vault-terminal-settings-desc',
    });

    const config = this.configManager.get();
    const toolbarIds = config.toolbar ?? [];
    const actions = config.actions ?? [];

    if (toolbarIds.length === 0) {
      container.createEl('p', {
        text: 'No actions added to toolbar.',
        cls: 'vault-terminal-settings-empty',
      });
    }

    for (const id of toolbarIds) {
      const action = actions.find((a) => a.id === id);
      if (!action) continue;

      new Setting(container)
        .setName(action.label)
        .setDesc(id)
        .addToggle((toggle) =>
          toggle.setValue(toolbarIds.includes(id)).onChange(async (v) => {
            const toolbar = this.configManager.get().toolbar ?? [];
            const newToolbar = v ? [...toolbar, id] : toolbar.filter((t) => t !== id);
            this.configManager.update({ toolbar: newToolbar });
            await this.configManager.save();
          }),
        )
        .addExtraButton((b) =>
          b.setIcon('arrow-up').setTooltip('Move up').onClick(async () => {
            const toolbar = [...(this.configManager.get().toolbar ?? [])];
            const idx = toolbar.indexOf(id);
            if (idx > 0) {
              [toolbar[idx - 1], toolbar[idx]] = [toolbar[idx], toolbar[idx - 1]];
              this.configManager.update({ toolbar });
              await this.configManager.save();
              this.display();
            }
          }),
        )
        .addExtraButton((b) =>
          b.setIcon('arrow-down').setTooltip('Move down').onClick(async () => {
            const toolbar = [...(this.configManager.get().toolbar ?? [])];
            const idx = toolbar.indexOf(id);
            if (idx >= 0 && idx < toolbar.length - 1) {
              [toolbar[idx], toolbar[idx + 1]] = [toolbar[idx + 1], toolbar[idx]];
              this.configManager.update({ toolbar });
              await this.configManager.save();
              this.display();
            }
          }),
        );
    }
  }
}
