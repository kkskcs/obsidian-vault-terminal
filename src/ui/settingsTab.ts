import { App, Notice, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type VaultTerminalPlugin from '../main';
import {
  ConfigManager,
  LOCALE_OPTIONS,
  normalizeEnvEntry,
  OpenLocation,
  PREDEFINED_PROFILES,
  ProfileTheme,
} from '../config/configManager';
import {
  checkRuntimeStatus,
  RuntimeStatus,
} from '../terminal/pythonRuntime';
import { getSystemFonts } from '../utils/fonts';
import { VT_ICON } from './iconRegistry';
import { AUTHOR_NAME, openExternalUrl, REPOSITORY_URL, RUNTIME_SETUP_URL } from './links';
import { EnvVarModal, ProfileNameModal } from './modals';

type TabId = 'general' | 'profile' | 'toolbar' | 'snippets' | 'runtime' | 'about';
type ToolbarDraftItem = { type: 'tool'; toolId: string } | { type: 'divider' } | { type: 'spacer'; units: number };


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
  private snippetGroups: string[] = ['Common'];
  private snippetGroupOpen: Record<string, boolean> = {};
  private toolsSectionOpen: Record<string, boolean> = { builtin: false, custom: false };
  private envSectionOpen: Record<string, boolean> = { builtin: false, custom: false };
  private toolbarRowsDraft: ToolbarDraftItem[][] | null = null;
  private toolbarRowOpen: Record<number, boolean> = {};
  private runtimeStatus: RuntimeStatus | null = null;
  private runtimeStatusLoading = false;
  private runtimeLastChecked: string | null = null;

  constructor(
    app: App,
    private readonly vaultTerminalPlugin: VaultTerminalPlugin,
    private readonly configManager: ConfigManager,
  ) {
    super(app, vaultTerminalPlugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.renderTabNav(containerEl);

    const body = containerEl.createDiv({ cls: 'vault-terminal-settings-body' });
    if (this.activeTab === 'general') this.renderGeneralTab(body);
    else if (this.activeTab === 'profile') this.renderProfileTab(body);
    else if (this.activeTab === 'toolbar') this.renderToolbarTab(body);
    else if (this.activeTab === 'snippets') this.renderSnippetsTab(body);
    else if (this.activeTab === 'runtime') this.renderRuntimeTab(body);
    else this.renderAboutTab(body);
  }

  openRuntimeTab(): void {
    this.activeTab = 'runtime';
    this.display();
  }

  private summarize(items: string[]): string[] {
    return items;
  }

  private buildTwoLineDesc(
    summary: string,
    detail: string[],
    showDetail = true,
    selectable = false,
  ): DocumentFragment {
    const frag = document.createDocumentFragment();
    const summaryEl = document.createElement('div');
    summaryEl.textContent = summary;
    frag.append(summaryEl);
    if (showDetail && detail.length > 0) {
      const detailEl = document.createElement('div');
      detailEl.className = 'vault-terminal-settings-desc-detail';
      if (selectable) {
        detailEl.addClass('vault-terminal-settings-desc-detail-selectable');
      }
      for (const item of detail) {
        detailEl.createEl('span', {
          cls: 'vault-terminal-settings-desc-chip',
          text: item,
        });
      }
      frag.append(detailEl);
    }
    return frag;
  }

  private renderTabNav(container: HTMLElement): void {
    const nav = container.createDiv({ cls: 'vault-terminal-settings-nav' });
    const tabs: { id: TabId; label: string }[] = [
      { id: 'general', label: 'General' },
      { id: 'profile', label: 'Profile' },
      { id: 'toolbar', label: 'Toolbar' },
      { id: 'snippets', label: 'Snippets' },
      { id: 'runtime', label: 'Runtime' },
      { id: 'about', label: 'About' },
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

    const openBehavior = {
      location: 'split-down' as OpenLocation,
      pinned: true,
      ...this.configManager.get().openBehavior,
    };

    new Setting(container)
      .setName('Open location')
      .setDesc('Where a new terminal leaf should open relative to the currently active tab.')
      .addDropdown((dd) => {
        dd.addOptions({
          tab: 'New tab',
          'split-right': 'Split right',
          'split-left': 'Split left',
          'split-down': 'Split down',
          'split-up': 'Split up',
        });
        dd.setValue(openBehavior.location).onChange(async (v) => {
          this.configManager.update({
            openBehavior: { ...openBehavior, location: v as OpenLocation },
          });
          await this.configManager.save();
        });
        return dd;
      });

    new Setting(container)
      .setName('Pin terminal leaf')
      .setDesc('Keep the terminal pinned so normal note navigation does not replace it.')
      .addToggle((toggle) =>
        toggle.setValue(openBehavior.pinned).onChange(async (v) => {
          this.configManager.update({
            openBehavior: { ...openBehavior, pinned: v },
          });
          await this.configManager.save();
        }),
      );

  }

  private renderEnvSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Environment Variables' });

    const builtinVars = [
      { key: 'VAULT_ROOT', desc: 'Absolute path to the vault root directory' },
      { key: 'OBSIDIAN_PLUGIN_DIR', desc: 'Absolute path to this plugin directory' },
    ];
    let builtinOpen = this.envSectionOpen.builtin ?? false;
    const builtinHeader = new Setting(container)
      .setName(`Built-in (${builtinVars.length})`)
      .setDesc(this.buildTwoLineDesc('Read-only variables.', this.summarize(builtinVars.map(({ key }) => key)), !builtinOpen, true));
    builtinHeader.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
    builtinHeader.addExtraButton((b) => {
      b.setIcon(builtinOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
      b.onClick(() => {
        builtinOpen = !builtinOpen;
        this.envSectionOpen.builtin = builtinOpen;
        const editorEl = container.querySelector('[data-env-section="builtin"]') as HTMLElement | null;
        editorEl?.toggleClass('is-open', builtinOpen);
        builtinHeader.setDesc(this.buildTwoLineDesc('Read-only variables.', this.summarize(builtinVars.map(({ key }) => key)), !builtinOpen, true));
        b.setIcon(builtinOpen ? 'chevron-up' : 'chevron-down');
      });
      return b;
    });
    const builtinBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
    builtinBody.setAttribute('data-env-section', 'builtin');
    builtinBody.toggleClass('is-open', builtinOpen);
    for (const { key, desc } of builtinVars) {
      new Setting(builtinBody)
        .setName(key)
        .setDesc(desc);
    }
    container.createEl('hr', { cls: 'vault-terminal-settings-hr' });

    const env = this.configManager.get().env ?? {};
    const entries = Object.entries(env).map(([key, entry]) => [key, normalizeEnvEntry(entry)] as const);
    let customOpen = this.envSectionOpen.custom ?? false;
    const customHeader = new Setting(container)
      .setName(`Custom (${entries.length})`)
      .setDesc(this.buildTwoLineDesc('User-defined environment variables.', this.summarize(entries.map(([key]) => key)), !customOpen, true));
    customHeader.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
    customHeader.addExtraButton((b) => {
      b.setIcon(customOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
      b.onClick(() => {
        customOpen = !customOpen;
        this.envSectionOpen.custom = customOpen;
        const editorEl = container.querySelector('[data-env-section="custom"]') as HTMLElement | null;
        editorEl?.toggleClass('is-open', customOpen);
        customHeader.setDesc(this.buildTwoLineDesc('User-defined environment variables.', this.summarize(entries.map(([key]) => key)), !customOpen, true));
        b.setIcon(customOpen ? 'chevron-up' : 'chevron-down');
      });
      return b;
    });
    const customBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
    customBody.setAttribute('data-env-section', 'custom');
    customBody.toggleClass('is-open', customOpen);

    if (entries.length === 0) {
      customBody.createEl('p', {
        text: 'No environment variables defined.',
        cls: 'vault-terminal-settings-empty',
      });
    }

    for (const [key, envVar] of entries) {
      const s = new Setting(customBody).setName(key);
      const sep = s.nameEl.createEl('span', { text: ' = ' });
      sep.style.cssText = 'color:var(--text-faint);font-family:monospace;';
      const valEl = s.nameEl.createEl('span', { text: envVar.value });
      valEl.style.cssText = 'color:var(--text-muted);font-family:monospace;font-weight:normal;';
      if (envVar.description) {
        s.setDesc(envVar.description);
      }
      s.addExtraButton((b) =>
          b.setIcon('pencil').setTooltip('Edit').onClick(() => {
            new EnvVarModal(
              this.app,
              async (newKey, newValue, newDescription) => {
                const newEnv = { ...this.configManager.get().env };
                delete newEnv[key];
                newEnv[newKey] = { value: newValue, description: newDescription.trim() || undefined };
                this.configManager.update({ env: newEnv });
                await this.configManager.save();
              },
              () => this.display(),
              key,
              envVar.value,
              envVar.description ?? '',
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

    new Setting(customBody).addButton((b) =>
      b
        .setButtonText('Add variable')
        .setCta()
        .onClick(() => {
          new EnvVarModal(this.app, async (newKey, newValue, newDescription) => {
            const newEnv = {
              ...this.configManager.get().env,
              [newKey]: { value: newValue, description: newDescription.trim() || undefined },
            };
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
      setting.setDesc('');
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
    this.renderToolbarOrderSection(container);
    this.renderToolsSection(container);
  }

  private renderToolsSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Tools' });
    container.createEl('p', {
      text: 'Tools are runnable buttons. Most custom tools should reference snippets.',
      cls: 'vault-terminal-settings-desc',
    });

    const builtinTools: Array<{ name: string; icon: string; desc: string }> = [
      { name: 'Env', icon: 'key', desc: 'Show environment variable helper.' },
      { name: 'History', icon: 'clock', desc: 'Show command/input history helper.' },
      { name: 'Profile', icon: 'palette', desc: 'Switch terminal profile quickly.' },
      { name: 'Fullscreen', icon: 'maximize-2', desc: 'Toggle terminal fullscreen mode.' },
      { name: 'New Window', icon: 'external-link', desc: 'Open terminal in a separate window.' },
      { name: 'Note → Terminal', icon: 'file-input', desc: 'Send note content or selection to terminal.' },
      { name: 'Terminal → Note', icon: 'file-output', desc: 'Capture terminal output into note.' },
    ];
    const actions = (this.configManager.get().actions ?? []).filter((action) => action.mode !== 'passthrough');
    let builtinOpen = this.toolsSectionOpen.builtin ?? false;

    const builtinHeader = new Setting(container)
      .setName(`Built-in tools (${builtinTools.length})`)
      .setDesc(this.buildTwoLineDesc('Plugin-provided tools.', this.summarize(builtinTools.map((tool) => tool.name)), !builtinOpen));
    builtinHeader.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
    builtinHeader.addExtraButton((b) => {
      b.setIcon(builtinOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
      b.onClick(() => {
        builtinOpen = !builtinOpen;
        this.toolsSectionOpen.builtin = builtinOpen;
        const editorEl = container.querySelector('[data-tools-section="builtin"]') as HTMLElement | null;
        editorEl?.toggleClass('is-open', builtinOpen);
        builtinHeader.setDesc(this.buildTwoLineDesc('Plugin-provided tools.', this.summarize(builtinTools.map((tool) => tool.name)), !builtinOpen));
        b.setIcon(builtinOpen ? 'chevron-up' : 'chevron-down');
      });
      return b;
    });

    const builtinBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
    builtinBody.setAttribute('data-tools-section', 'builtin');
    builtinBody.toggleClass('is-open', builtinOpen);

    for (const tool of builtinTools) {
      const s = new Setting(builtinBody)
        .setName(tool.name)
        .setDesc(tool.desc);
      const icon = document.createElement('span');
      icon.style.marginRight = '8px';
      setIcon(icon, tool.icon);
      s.nameEl.prepend(icon);
    }

    container.createEl('hr', { cls: 'vault-terminal-settings-hr' });
    let customOpen = this.toolsSectionOpen.custom ?? false;
    const customHeader = new Setting(container)
      .setName(`Custom tools (${actions.length})`)
      .setDesc(this.buildTwoLineDesc('User-defined tools for snippets/scripts.', this.summarize(actions.map((action) => action.label)), !customOpen));
    customHeader.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
    customHeader.addExtraButton((b) => {
      b.setIcon(customOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
      b.onClick(() => {
        customOpen = !customOpen;
        this.toolsSectionOpen.custom = customOpen;
        const editorEl = container.querySelector('[data-tools-section="custom"]') as HTMLElement | null;
        editorEl?.toggleClass('is-open', customOpen);
        customHeader.setDesc(this.buildTwoLineDesc('User-defined tools for snippets/scripts.', this.summarize(actions.map((action) => action.label)), !customOpen));
        b.setIcon(customOpen ? 'chevron-up' : 'chevron-down');
      });
      return b;
    });

    const customBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
    customBody.setAttribute('data-tools-section', 'custom');
    customBody.toggleClass('is-open', customOpen);

    if (actions.length === 0) {
      customBody.createEl('p', {
        text: 'No custom tools defined.',
        cls: 'vault-terminal-settings-empty',
      });
    }

    for (const action of actions) {
      const s = new Setting(customBody)
        .setName(action.label)
        .setDesc(`${action.mode}${action.command ? ` · ${action.command}` : ''}`)
        .addExtraButton((b) => b.setIcon('pencil').setTooltip('Edit').onClick(() => {}))
        .addExtraButton((b) => b.setIcon('trash').setTooltip('Delete').onClick(() => {}));
      const icon = document.createElement('span');
      icon.style.marginRight = '8px';
      setIcon(icon, action.icon ?? 'terminal');
      s.nameEl.prepend(icon);
    }

    new Setting(customBody).addButton((b) =>
      b
        .setButtonText('Add tool')
        .setCta()
        .onClick(() => {}),
    );
  }

  private renderToolbarOrderSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Toolbar Order' });
    container.createEl('p', { text: 'Add toolbar rows.', cls: 'vault-terminal-settings-desc' });

    const config = this.configManager.get();
    const actions = config.actions ?? [];
    const toolActions = actions.filter((a) => a.mode !== 'passthrough');
    if (!this.toolbarRowsDraft) {
      const legacy = (config.toolbar ?? []).filter((id) => toolActions.some((a) => a.id === id));
      this.toolbarRowsDraft = [0, 1].map((i) =>
        legacy[i] ? [{ type: 'tool', toolId: legacy[i] } as ToolbarDraftItem] : [],
      );
      if (!this.toolbarRowsDraft[0][0] && toolActions[0]) {
        this.toolbarRowsDraft[0] = [{ type: 'tool', toolId: toolActions[0].id }];
      }
    }

    this.toolbarRowsDraft.forEach((row, rowIndex) => {
      const item = row[0];
      const rowLabel = rowIndex === 0 ? 'Top' : 'Bottom';

      const rowSetting = new Setting(container)
        .setName(rowLabel)
        .addExtraButton((b) => {
          b.setIcon('plus').setTooltip('Tool').onClick(() => {
            const firstTool = toolActions[0]?.id;
            if (!firstTool) return;
            const rows = [...(this.toolbarRowsDraft ?? [])];
            rows[rowIndex] = [{ type: 'tool', toolId: firstTool }];
            this.toolbarRowsDraft = rows;
            this.display();
          });
          return b;
        })
        .addExtraButton((b) => {
          b.setIcon(VT_ICON.toolbarDivider).setTooltip('Divider').onClick(() => {
            const rows = [...(this.toolbarRowsDraft ?? [])];
            rows[rowIndex] = [{ type: 'divider' }];
            this.toolbarRowsDraft = rows;
            this.display();
          });
          return b;
        })
        .addExtraButton((b) => {
          b.setIcon('square-dashed').setTooltip('Spacer').onClick(() => {
            const rows = [...(this.toolbarRowsDraft ?? [])];
            rows[rowIndex] = [{ type: 'spacer', units: 1 }];
            this.toolbarRowsDraft = rows;
            this.display();
          });
          return b;
        });
      rowSetting.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
      rowSetting.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
      rowSetting.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
      rowSetting.addToggle((toggle) =>
        toggle.setValue(rowIndex === 0 ? true : !!item).onChange((v) => {
          const rows = [...(this.toolbarRowsDraft ?? [])];
          if (!v) {
            if (rowIndex === 0) return;
            rows[rowIndex] = [];
          } else if (!rows[rowIndex][0]) {
            const firstTool = toolActions[0]?.id;
            if (firstTool) rows[rowIndex] = [{ type: 'tool', toolId: firstTool }];
          }
          this.toolbarRowsDraft = rows;
          this.display();
        }),
      );
      rowSetting.addExtraButton((b) => {
        const isOpen = this.toolbarRowOpen[rowIndex] ?? false;
        b.setIcon(isOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
        b.onClick(() => {
          const next = !(this.toolbarRowOpen[rowIndex] ?? false);
          this.toolbarRowOpen[rowIndex] = next;
          const editorEl = container.querySelector(`[data-toolbar-row="${rowIndex}"]`) as HTMLElement | null;
          editorEl?.toggleClass('is-open', next);
          b.setIcon(next ? 'chevron-up' : 'chevron-down');
        });
        return b;
      });
      const rowBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
      rowBody.setAttribute('data-toolbar-row', String(rowIndex));
      rowBody.toggleClass('is-open', this.toolbarRowOpen[rowIndex] ?? false);
      if (item?.type === 'tool') {
        let currentToolId = item.toolId;
        new Setting(rowBody)
          .setName('Tool')
          .addDropdown((dd) => {
            for (const tool of toolActions) dd.addOption(tool.id, tool.label);
            dd.setValue(currentToolId).onChange((v) => {
              currentToolId = v;
            });
            return dd;
          })
          .addExtraButton((b) =>
            b.setIcon('check').setTooltip('Apply').onClick(() => {
              const rows = [...(this.toolbarRowsDraft ?? [])];
              rows[rowIndex] = [{ type: 'tool', toolId: currentToolId }];
              this.toolbarRowsDraft = rows;
              this.display();
            }),
          );
      } else if (item?.type === 'spacer') {
        let units = String(item.units);
        new Setting(rowBody)
          .setName('Spacer units')
          .addText((t) => t.setValue(units).onChange((v) => { units = v; }))
          .addExtraButton((b) =>
            b.setIcon('check').setTooltip('Apply').onClick(() => {
              const parsed = Math.max(1, parseInt(units, 10) || 1);
              const rows = [...(this.toolbarRowsDraft ?? [])];
              rows[rowIndex] = [{ type: 'spacer', units: parsed }];
              this.toolbarRowsDraft = rows;
              this.display();
            }),
          );
      } else if (item?.type === 'divider') {
        rowBody.createEl('p', { text: 'Divider', cls: 'vault-terminal-settings-empty' });
      }
    });

    new Setting(container)
        .setName('Reset to defaults')
        .setDesc('Restore toolbar rows from current registered toolbar tools.')
        .addExtraButton((b) =>
          b.setIcon('rotate-ccw').setTooltip('Reset').onClick(() => {
            const legacy = (this.configManager.get().toolbar ?? []).filter((id) => toolActions.some((a) => a.id === id));
            this.toolbarRowsDraft = [0, 1].map((i) =>
              legacy[i] ? [{ type: 'tool', toolId: legacy[i] } as ToolbarDraftItem] : [],
            );
            if (!this.toolbarRowsDraft[0][0] && toolActions[0]) {
              this.toolbarRowsDraft[0] = [{ type: 'tool', toolId: toolActions[0].id }];
            }
            new Notice('Toolbar rows reset.');
            this.display();
          }),
        );
  }

  private renderSnippetsTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Snippets' });
    container.createEl('p', {
      text: 'Reusable text blocks for terminal input. Use {{key}} placeholders for prompt-time substitution.',
      cls: 'vault-terminal-settings-desc',
    });

    const actions = this.configManager.get().actions ?? [];
    const snippetLike = actions.filter((action) => action.mode === 'template');
    const detectedGroups = Array.from(
      new Set(snippetLike.map((action) => action.group?.trim() || 'Common')),
    );
    const mergedGroups = Array.from(new Set(['Common', ...this.snippetGroups, ...detectedGroups]))
      .filter((g) => g.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
    this.snippetGroups = mergedGroups;

    new Setting(container)
      .setName('Groups')
      .setDesc(this.buildTwoLineDesc('Create free-form groups and manage snippets inside each section.', [], false))
      .addButton((b) =>
        b
          .setButtonText('Add group')
          .setCta()
          .onClick(() => {
            const name = window.prompt('Group name');
            if (!name) return;
            const group = name.trim();
            if (!group) return;
            if (this.snippetGroups.includes(group)) return;
            this.snippetGroups = [...this.snippetGroups, group];
            this.display();
          }),
      );

    for (const group of this.snippetGroups) {
      const groupSnippets = snippetLike.filter((action) => (action.group?.trim() || 'Common') === group);
      let isOpen = this.snippetGroupOpen[group] ?? false;
      const setting = new Setting(container)
        .setName(group)
        .setDesc(this.buildTwoLineDesc(`${groupSnippets.length} snippet(s)`, this.summarize(groupSnippets.map((action) => action.label)), !isOpen));
      setting.controlEl.createEl('span', { cls: 'vault-terminal-profile-expand-spacer' });
      setting.addExtraButton((b) => {
        b.setIcon(isOpen ? 'chevron-up' : 'chevron-down').setTooltip('Expand');
        b.onClick(() => {
          isOpen = !isOpen;
          this.snippetGroupOpen[group] = isOpen;
          const editorEl = container.querySelector(`[data-snippet-group="${group}"]`) as HTMLElement | null;
          editorEl?.toggleClass('is-open', isOpen);
          setting.setDesc(this.buildTwoLineDesc(`${groupSnippets.length} snippet(s)`, this.summarize(groupSnippets.map((action) => action.label)), !isOpen));
          b.setIcon(isOpen ? 'chevron-up' : 'chevron-down');
        });
        return b;
      });

      const groupBody = container.createDiv({ cls: 'vault-terminal-profile-inline-editor' });
      groupBody.setAttribute('data-snippet-group', group);
      groupBody.toggleClass('is-open', isOpen);
      if (groupSnippets.length === 0) {
        groupBody.createEl('p', {
          text: 'No snippets in this group.',
          cls: 'vault-terminal-settings-empty',
        });
      }

      for (const action of groupSnippets) {
        const preview = action.command?.trim()
          ? action.command.trim().split('\n').slice(0, 2).join(' / ')
          : '(empty)';
        new Setting(groupBody)
          .setName(action.label)
          .setDesc(preview)
          .addExtraButton((b) => b.setIcon('pencil').setTooltip('Edit').onClick(() => {}))
          .addExtraButton((b) => b.setIcon('trash').setTooltip('Delete').onClick(() => {}));
      }

      new Setting(groupBody).addButton((b) =>
        b
          .setButtonText('Add snippet')
          .setCta()
          .onClick(() => {}),
      );
    }
  }

  private renderRuntimeTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Runtime' });

    const status = this.runtimeStatus;
    const summary = status
      ? (status.available ? 'Ready' : 'Needs setup')
      : (this.runtimeStatusLoading ? 'Checking...' : 'Not checked');

    const runtimeHeaderSetting = new Setting(container)
      .setName('Terminal runtime')
      .setDesc(`${summary}. Python backend used to start terminal sessions.${this.runtimeLastChecked ? ` Last checked: ${this.runtimeLastChecked}.` : ''}`)
      .addButton((b) =>
        b
          .setButtonText('Check again')
          .onClick(() => {
            this.refreshRuntimeStatus();
          }),
      );
    if (status && !status.available) {
      runtimeHeaderSetting.settingEl.addClass('vault-terminal-runtime-status-error');
    }

    const runtimeConfig = this.configManager.get().runtime ?? {};
    const pythonPathDesc = [
      'Optional explicit Python executable path. Leave empty to auto-detect from the current environment.',
      status?.pythonPath ? `Current: ${status.pythonPath}` : undefined,
    ].filter((line): line is string => Boolean(line)).join(' ');
    const pythonPathSetting = new Setting(container)
      .setName('Python path')
      .setDesc(pythonPathDesc)
      .addText((text) =>
        text
          .setPlaceholder(process.platform === 'win32' ? 'python.exe or C:\\Path\\to\\python.exe' : 'python3 or /usr/bin/python3')
          .setValue(runtimeConfig.pythonPath ?? '')
          .onChange(async (value) => {
            this.configManager.update({
              runtime: {
                ...this.configManager.get().runtime,
                pythonPath: value.trim() || undefined,
              },
            });
            await this.configManager.save();
          }),
      );
    pythonPathSetting.settingEl.addClass('vault-terminal-runtime-python-path');

    if (!status) {
      container.createEl('p', {
        text: this.runtimeStatusLoading ? 'Checking runtime status...' : 'Click Check again to inspect the runtime.',
        cls: 'vault-terminal-settings-empty',
      });
      if (!this.runtimeStatusLoading) {
        this.refreshRuntimeStatus();
      }
      return;
    }

    this.renderRuntimeStatusRows(container, status);

    const setupGuideSetting = this.renderExternalLink(container, 'Runtime setup guide', RUNTIME_SETUP_URL);
    if (!status.available) {
      setupGuideSetting.settingEl.addClass('vault-terminal-runtime-status-error');
    }
  }

  private renderRuntimeStatusRows(container: HTMLElement, status: RuntimeStatus): void {
    const rows: Array<[string, string]> = [
      ['Platform', `${status.platform}-${status.arch}`],
      ['Backend', status.backend],
      ['Python version', status.pythonVersion ?? '(not found)'],
      ['Message', status.message],
    ];

    for (const [name, value] of rows) {
      new Setting(container).setName(name).setDesc(value);
    }
  }

  private async refreshRuntimeStatus(): Promise<void> {
    this.runtimeStatusLoading = true;
    this.display();
    try {
      this.runtimeStatus = await checkRuntimeStatus(this.vaultTerminalPlugin.getPluginDirectory(), {
        pythonPath: this.configManager.get().runtime?.pythonPath,
      });
      this.runtimeLastChecked = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('Failed to check Vault Terminal runtime', error);
      this.runtimeStatus = {
        platform: process.platform,
        arch: process.arch,
        backend: process.platform === 'win32' ? 'winpty' : 'posix-pty',
        pythonPath: null,
        pythonVersion: null,
        available: false,
        message: 'Runtime check failed. See README.md and developer console.',
      };
    } finally {
      this.runtimeStatusLoading = false;
      this.display();
    }
  }

  private renderAboutTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'About' });

    new Setting(container)
      .setName('Vault Terminal')
      .setDesc('Embedded terminal for Obsidian with vault-aware actions and links.');

    new Setting(container)
      .setName('Version')
      .setDesc(this.vaultTerminalPlugin.manifest.version);

    new Setting(container)
      .setName('Author')
      .setDesc(AUTHOR_NAME);

    this.renderExternalLink(container, 'GitHub repository', REPOSITORY_URL);

    new Setting(container)
      .setName('License')
      .setDesc('MIT');
  }

  private renderExternalLink(container: HTMLElement, name: string, url: string): Setting {
    return new Setting(container)
      .setName(name)
      .setDesc(url)
      .addButton((button) =>
        button
          .setButtonText('Open')
          .onClick(() => openExternalUrl(url)),
      );
  }
}
