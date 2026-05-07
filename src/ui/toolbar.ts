import { App, setIcon, setTooltip } from 'obsidian';
import { VT_ICON } from './iconRegistry';

export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export interface SystemButtonCallbacks {
  onEnvClick: () => void;
  onHistoryClick: () => void;
  onProfileClick: () => void;
  onFullscreenClick: () => void;
  onNewWindowClick: () => void;
  onNoteToTerminal: () => void;
  onTerminalToNote: () => void;
}

type SystemButtonDef = {
  icon: string;
  tooltip: string;
  key: keyof SystemButtonCallbacks;
};

const SYSTEM_BUTTONS: SystemButtonDef[] = [
  { icon: 'key', tooltip: 'Env', key: 'onEnvClick' },
  { icon: 'clock', tooltip: 'History', key: 'onHistoryClick' },
  { icon: 'palette', tooltip: 'Profile', key: 'onProfileClick' },
  { icon: 'maximize-2', tooltip: 'Fullscreen', key: 'onFullscreenClick' },
  { icon: 'external-link', tooltip: 'New Window', key: 'onNewWindowClick' },
];

const BIDIR_BUTTONS: SystemButtonDef[] = [
  { icon: 'file-input', tooltip: 'Note → Terminal', key: 'onNoteToTerminal' },
  { icon: 'file-output', tooltip: 'Terminal → Note', key: 'onTerminalToNote' },
];

export class Toolbar {
  private actionButtons: ActionButton[] = [];

  constructor(
    private readonly el: HTMLElement,
    private readonly app: App,
    private readonly callbacks: SystemButtonCallbacks,
  ) {}

  setActionButtons(buttons: ActionButton[]): void {
    this.actionButtons = buttons;
    this.render();
  }

  render(): void {
    this.el.empty();

    const systemGroup = this.el.createDiv({ cls: 'vault-terminal-toolbar-system' });
    for (const btn of SYSTEM_BUTTONS) {
      this.createIconButton(systemGroup, btn.icon, btn.tooltip, this.callbacks[btn.key]);
    }

    this.el.createDiv({ cls: 'vault-terminal-toolbar-divider' });

    const bidirGroup = this.el.createDiv({ cls: 'vault-terminal-toolbar-bidir' });
    for (const btn of BIDIR_BUTTONS) {
      this.createIconButton(bidirGroup, btn.icon, btn.tooltip, this.callbacks[btn.key]);
    }

    if (this.actionButtons.length > 0) {
      this.el.createDiv({ cls: 'vault-terminal-toolbar-separator' });
      const userGroup = this.el.createDiv({ cls: 'vault-terminal-toolbar-user' });
      for (const btn of this.actionButtons) {
        this.createIconButton(userGroup, btn.icon, btn.label, btn.onClick);
      }
    }
  }

  private createIconButton(
    container: HTMLElement,
    icon: string,
    tooltip: string,
    onClick: () => void,
  ): HTMLElement {
    const btn = container.createEl('button', { cls: 'vault-terminal-icon-btn' });
    setIcon(btn, icon);
    setTooltip(btn, tooltip);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return btn;
  }
}
