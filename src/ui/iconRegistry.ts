import { addIcon } from 'obsidian';

export const VT_ICON = {
  toolbarDivider: 'vt-toolbar-divider',
} as const;

const DIVIDER_SVG = `
  <rect x="46" y="14" width="8" height="72" rx="4" fill="currentColor" />
`;

export function registerCustomIcons(): void {
  addIcon(VT_ICON.toolbarDivider, DIVIDER_SVG);
}
