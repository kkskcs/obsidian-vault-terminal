export const AUTHOR_NAME = 'kkskcs';
export const REPOSITORY_NAME = 'obsidian-vault-terminal';
export const REPOSITORY_URL = `https://github.com/${AUTHOR_NAME}/${REPOSITORY_NAME}`;
export const RUNTIME_SETUP_URL = `${REPOSITORY_URL}#runtime-setup`;

export function openExternalUrl(url: string): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('electron').shell.openExternal(url);
}
