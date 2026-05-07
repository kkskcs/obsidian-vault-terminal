import { IBufferLine, IBufferRange, ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import { App } from 'obsidian';

const WIKILINK_RE = /\[\[[^\]]+\]\]/g;

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

class VaultLinkProvider implements ILinkProvider {
  constructor(
    private readonly terminal: Terminal,
    private readonly app: App,
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
        decorations: { underline: true, pointerCursor: true },
        activate: (_e, _t) => this.app.workspace.openLinkText(linktext, '', false),
      });
    }

    callback(links.length > 0 ? links : undefined);
  }
}

export function registerLinkProvider(terminal: Terminal, app: App): void {
  terminal.registerLinkProvider(new VaultLinkProvider(terminal, app));
}
