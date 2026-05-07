import { IBufferLine, IBufferRange, ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import { App } from 'obsidian';
import { ConfigManager } from '../config/configManager';

const WIKILINK_RE = /\[\[[^\]]+\]\]/g;

const ANSI_PALETTE_KEYS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const;

const DEFAULT_ANSI_COLORS = [
  '#2e3436',
  '#cc0000',
  '#4e9a06',
  '#c4a000',
  '#3465a4',
  '#75507b',
  '#06989a',
  '#d3d7cf',
  '#555753',
  '#ef2929',
  '#8ae234',
  '#fce94f',
  '#729fcf',
  '#ad7fa8',
  '#34e2e2',
  '#eeeeec',
];

const COLOR_CUBE_STEPS = [0, 95, 135, 175, 215, 255];

interface MatchResult {
  raw: string;
  start: number;
  end: number;
  linktext: string;
}

function buildCharToCol(line: IBufferLine): number[] {
  const charToCol: number[] = [];
  const cell = line.getCell(0);
  if (!cell) return charToCol;
  let col = 0;
  const len = line.length;
  while (col < len) {
    const c = line.getCell(col, cell);
    if (!c) break;
    const width = c.getWidth();
    if (width === 0) {
      col++;
      continue;
    }
    charToCol.push(col);
    col += width;
  }
  return charToCol;
}

function findMatches(text: string): MatchResult[] {
  const results: MatchResult[] = [];
  const re = new RegExp(WIKILINK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    results.push({ raw: m[0], start: m.index, end, linktext: m[0].slice(2, -2) });
  }
  return results;
}

function getCellSize(terminal: Terminal): { w: number; h: number } {
  const dims = (
    terminal as unknown as {
      _core?: { _renderService?: { dimensions?: { css?: { cell?: { width: number; height: number } } } } };
    }
  )._core?._renderService?.dimensions?.css?.cell;
  if (dims) return { w: dims.width, h: dims.height };

  const screen = terminal.element?.querySelector('.xterm-screen') as HTMLElement | null;
  if (!screen) return { w: 8, h: 16 };
  return {
    w: screen.offsetWidth / terminal.cols,
    h: screen.offsetHeight / terminal.rows,
  };
}

function getFallbackFg(configManager: ConfigManager): string {
  const config = configManager.get();
  const profileName = config.defaultProfile ?? 'basic';
  return config.profiles?.[profileName]?.theme?.foreground ?? '#d4d4d4';
}

function toRgb(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

function resolvePaletteColor(terminal: Terminal, configManager: ConfigManager, index: number): string {
  if (index < 16) {
    const key = ANSI_PALETTE_KEYS[index];
    const terminalColor = terminal.options.theme?.[key];
    if (terminalColor) return terminalColor;

    const config = configManager.get();
    const profileName = config.defaultProfile ?? 'basic';
    const profileColor = config.profiles?.[profileName]?.theme?.[key];
    return profileColor ?? DEFAULT_ANSI_COLORS[index];
  }

  if (index >= 16 && index < 232) {
    const offset = index - 16;
    const r = COLOR_CUBE_STEPS[Math.floor(offset / 36)];
    const g = COLOR_CUBE_STEPS[Math.floor((offset % 36) / 6)];
    const b = COLOR_CUBE_STEPS[offset % 6];
    return toRgb(r, g, b);
  }

  if (index >= 232 && index < 256) {
    const gray = 8 + (index - 232) * 10;
    return toRgb(gray, gray, gray);
  }

  return terminal.options.theme?.foreground ?? getFallbackFg(configManager);
}

function resolveFgColor(terminal: Terminal, configManager: ConfigManager, bufferLineIndex: number, col: number): string {
  const line = terminal.buffer.active.getLine(bufferLineIndex - 1);
  if (!line) return getFallbackFg(configManager);

  const cell = line.getCell(col - 1);
  if (!cell) return getFallbackFg(configManager);

  if (cell.isFgDefault()) return getFallbackFg(configManager);

  if (cell.isFgRGB()) {
    const n = cell.getFgColor();
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return toRgb(r, g, b);
  }

  if (cell.isFgPalette()) {
    return resolvePaletteColor(terminal, configManager, cell.getFgColor());
  }

  return terminal.options.theme?.foreground ?? getFallbackFg(configManager);
}

class VaultLinkProvider implements ILinkProvider {
  private overlayEl: HTMLElement | null = null;

  constructor(
    private readonly terminal: Terminal,
    private readonly app: App,
    private readonly configManager: ConfigManager,
  ) {}

  provideLinks(bufferLineIndex: number, callback: (links: ILink[] | undefined) => void): void {
    const line = this.terminal.buffer.active.getLine(bufferLineIndex - 1);
    if (!line) {
      callback(undefined);
      return;
    }

    const text = line.translateToString(true);
    const charToCol = buildCharToCol(line);
    const toCol = (i: number) =>
      i < charToCol.length ? charToCol[i] : (charToCol[charToCol.length - 1] ?? 0) + 1;

    const links: ILink[] = [];

    for (const match of findMatches(text)) {
      const range: IBufferRange = {
        start: { x: toCol(match.start) + 1, y: bufferLineIndex },
        end: { x: toCol(match.end - 1) + 1, y: bufferLineIndex },
      };
      const linktext = match.linktext;
      links.push({
        range,
        text: match.raw,
        decorations: { underline: false, pointerCursor: true },
        activate: (_e, _t) => this.app.workspace.openLinkText(linktext, '', false),
        hover: () => this.showOverlay(range, bufferLineIndex),
        leave: () => this.hideOverlay(),
        dispose: () => this.hideOverlay(),
      });
    }

    callback(links.length > 0 ? links : undefined);
  }

  private showOverlay(range: IBufferRange, bufferLineIndex: number): void {
    this.hideOverlay();

    const screen = this.terminal.element?.querySelector('.xterm-screen') as HTMLElement | null;
    if (!screen) return;

    const { w, h } = getCellSize(this.terminal);
    const color = resolveFgColor(this.terminal, this.configManager, bufferLineIndex, range.start.x);
    const viewportY = this.terminal.buffer.active.viewportY;
    const screenY = (range.start.y - 1 - viewportY) * h;
    const screenX = (range.start.x - 1) * w;
    const width = (range.end.x - range.start.x + 1) * w;

    const el = document.createElement('div');
    el.className = 'xterm-hover';
    el.style.cssText = [
      'position:absolute',
      `left:${screenX}px`,
      `top:${screenY + h - 2}px`,
      `width:${width}px`,
      `height:${Math.max(1, Math.ceil(h / 12))}px`,
      `background:${color}`,
      'pointer-events:none',
      'z-index:20',
    ].join(';');
    screen.appendChild(el);
    this.overlayEl = el;
  }

  private hideOverlay(): void {
    this.overlayEl?.remove();
    this.overlayEl = null;
  }
}

export function registerLinkProvider(
  terminal: Terminal,
  app: App,
  configManager: ConfigManager,
): void {
  terminal.registerLinkProvider(new VaultLinkProvider(terminal, app, configManager));
}
