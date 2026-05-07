import { App, FileSystemAdapter, Notice, TFile } from 'obsidian';

export interface ActionParam {
  name: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'choice';
  required?: boolean;
  useSelectedText?: boolean;
  useCurrentContext?: boolean;
  default?: string;
  choices?: string[];
}

export type ActionMode = 'template' | 'script' | 'uri' | 'context' | 'passthrough';
export type PassthroughAction = 'addTerminalOutputToNote' | 'sendSelectedTextToTerminal';
export type ContextType = 'currentFile' | 'currentTag' | 'vaultPath';

export interface ActionDef {
  id: string;
  label: string;
  icon?: string;
  mode: ActionMode;
  description?: string;
  command?: string;
  script?: string;
  workingDir?: string;
  contextType?: ContextType;
  action?: PassthroughAction;
  params?: ActionParam[];
}

export interface ProfileTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

export interface Profile {
  theme: ProfileTheme;
  matchObsidianBackground?: boolean;
}

export interface HistoryConfig {
  mode: 'none' | 'note' | 'daily';
  folder?: string;
  note?: string;
  maxEntries?: number;
}

export interface AddToNoteConfig {
  lines: number;
  askLines: boolean;
}

export type LocaleSetting = 'system' | 'app' | string;

export const LOCALE_OPTIONS: Record<string, string> = {
  system: '⚙ System default',
  app: '⚙ Follow Obsidian',
  'am_ET.UTF-8': 'አማርኛ',
  'ar_SA.UTF-8': 'العربية',
  'be_BY.UTF-8': 'Беларуская мова',
  'bn_BD.UTF-8': 'বাংলা',
  'ca_ES.UTF-8': 'Català',
  'cs_CZ.UTF-8': 'Čeština',
  'da_DK.UTF-8': 'Dansk',
  'de_DE.UTF-8': 'Deutsch',
  'el_GR.UTF-8': 'Ελληνικά',
  'en_US.UTF-8': 'English',
  'en_GB.UTF-8': 'English (GB)',
  'es_ES.UTF-8': 'Español',
  'fa_IR.UTF-8': 'فارسی',
  'fi_FI.UTF-8': 'Suomi',
  'fr_FR.UTF-8': 'Français',
  'ga_IE.UTF-8': 'Gaeilge',
  'he_IL.UTF-8': 'עברית',
  'hu_HU.UTF-8': 'Magyar',
  'id_ID.UTF-8': 'Bahasa Indonesia',
  'it_IT.UTF-8': 'Italiano',
  'ja_JP.UTF-8': '日本語',
  'ka_GE.UTF-8': 'ქართული',
  'km_KH.UTF-8': 'ខេមរភាសា',
  'ko_KR.UTF-8': '한국어',
  'lv_LV.UTF-8': 'Latviešu',
  'ms_MY.UTF-8': 'Bahasa Melayu',
  'ne_NP.UTF-8': 'नेपाली',
  'nl_NL.UTF-8': 'Nederlands',
  'no_NO.UTF-8': 'Norsk',
  'pl_PL.UTF-8': 'Język polski',
  'pt_PT.UTF-8': 'Português',
  'pt_BR.UTF-8': 'Português (Brasil)',
  'ro_RO.UTF-8': 'Română',
  'ru_RU.UTF-8': 'Русский',
  'sa_IN.UTF-8': 'संस्कृतम्',
  'sk_SK.UTF-8': 'Slovenčina',
  'sq_AL.UTF-8': 'Shqip',
  'sr_RS.UTF-8': 'Српски језик',
  'sv_SE.UTF-8': 'Svenska',
  'th_TH.UTF-8': 'ไทย',
  'tr_TR.UTF-8': 'Türkçe',
  'uk_UA.UTF-8': 'Українська',
  'uz_UZ.UTF-8': 'Oʻzbekcha',
  'vi_VN.UTF-8': 'Tiếng Việt',
  'zh_CN.UTF-8': '中文 (简体)',
  'zh_TW.UTF-8': '中文 (繁體)',
};

// Maps Obsidian language codes to LANG values
const APP_LOCALE_MAP: Record<string, string> = {
  am: 'am_ET.UTF-8',
  ar: 'ar_SA.UTF-8',
  be: 'be_BY.UTF-8',
  bn: 'bn_BD.UTF-8',
  ca: 'ca_ES.UTF-8',
  cs: 'cs_CZ.UTF-8',
  da: 'da_DK.UTF-8',
  de: 'de_DE.UTF-8',
  el: 'el_GR.UTF-8',
  en: 'en_US.UTF-8',
  'en-GB': 'en_GB.UTF-8',
  es: 'es_ES.UTF-8',
  fa: 'fa_IR.UTF-8',
  fi: 'fi_FI.UTF-8',
  fr: 'fr_FR.UTF-8',
  ga: 'ga_IE.UTF-8',
  he: 'he_IL.UTF-8',
  hu: 'hu_HU.UTF-8',
  id: 'id_ID.UTF-8',
  it: 'it_IT.UTF-8',
  ja: 'ja_JP.UTF-8',
  ka: 'ka_GE.UTF-8',
  kh: 'km_KH.UTF-8',
  ko: 'ko_KR.UTF-8',
  lv: 'lv_LV.UTF-8',
  ms: 'ms_MY.UTF-8',
  ne: 'ne_NP.UTF-8',
  nl: 'nl_NL.UTF-8',
  no: 'no_NO.UTF-8',
  pl: 'pl_PL.UTF-8',
  pt: 'pt_PT.UTF-8',
  'pt-BR': 'pt_BR.UTF-8',
  ro: 'ro_RO.UTF-8',
  ru: 'ru_RU.UTF-8',
  sa: 'sa_IN.UTF-8',
  sk: 'sk_SK.UTF-8',
  sq: 'sq_AL.UTF-8',
  sr: 'sr_RS.UTF-8',
  sv: 'sv_SE.UTF-8',
  th: 'th_TH.UTF-8',
  tr: 'tr_TR.UTF-8',
  uk: 'uk_UA.UTF-8',
  uz: 'uz_UZ.UTF-8',
  vi: 'vi_VN.UTF-8',
  zh: 'zh_CN.UTF-8',
  'zh-TW': 'zh_TW.UTF-8',
};

export function resolveLocale(setting: LocaleSetting, appLocale: string): string | undefined {
  if (setting === 'system') return undefined;
  if (setting === 'app') return APP_LOCALE_MAP[appLocale] ?? undefined;
  return setting;
}

export interface VaultTerminalConfig {
  version?: string;
  vaultRoot?: boolean;
  scriptFolder?: string;
  locale?: LocaleSetting;
  terminalOptions?: Record<string, unknown>;
  profiles?: Record<string, Profile>;
  defaultProfile?: string;
  env?: Record<string, string>;
  addToNote?: AddToNoteConfig;
  history?: HistoryConfig;
  actions?: ActionDef[];
  toolbar?: string[];
  ruleSets?: Array<{ id: string; label: string; actions: string[] }>;
  pathPatterns?: { enabled: boolean; patterns: Array<{ name: string; regex: string }> };
}

const CONFIG_PATH = '.vault-terminal/config.json';

export const PREDEFINED_PROFILES: Record<string, Profile> = {
  basic: {
    theme: {
      background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4',
      black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
      blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
      brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543',
      brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#e5e5e5',
    },
  },
  amber: {
    theme: {
      background: '#0c0c00', foreground: '#ffb000', cursor: '#ffb000',
      black: '#0c0c00', red: '#884400', green: '#886600', yellow: '#aa8800',
      blue: '#664400', magenta: '#885500', cyan: '#887700', white: '#ffb000',
      brightBlack: '#664400', brightRed: '#ffaa00', brightGreen: '#ffcc00', brightYellow: '#ffdd44',
      brightBlue: '#ff9900', brightMagenta: '#ffbb44', brightCyan: '#ffcc66', brightWhite: '#ffe599',
    },
  },
  'ayu-mirage': {
    theme: {
      background: '#1f2430', foreground: '#cbccc6', cursor: '#ffcc66',
      black: '#191e2a', red: '#ff3333', green: '#bae67e', yellow: '#ffd580',
      blue: '#73d0ff', magenta: '#d4bfff', cyan: '#95e6cb', white: '#c7c7c7',
      brightBlack: '#686868', brightRed: '#ff6565', brightGreen: '#d6f89f', brightYellow: '#ffe6a0',
      brightBlue: '#9be0ff', brightMagenta: '#e8d9ff', brightCyan: '#b8f8e5', brightWhite: '#ffffff',
    },
  },
  'catppuccin-latte': {
    theme: {
      background: '#eff1f5', foreground: '#4c4f69', cursor: '#dc8a78',
      black: '#5c5f77', red: '#d20f39', green: '#40a02b', yellow: '#df8e1d',
      blue: '#1e66f5', magenta: '#ea76cb', cyan: '#179299', white: '#acb0be',
      brightBlack: '#6c6f85', brightRed: '#d20f39', brightGreen: '#40a02b', brightYellow: '#df8e1d',
      brightBlue: '#1e66f5', brightMagenta: '#ea76cb', brightCyan: '#179299', brightWhite: '#bcc0cc',
    },
  },
  'catppuccin-mocha': {
    theme: {
      background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#f5e0dc',
      black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
      blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
      brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af',
      brightBlue: '#89b4fa', brightMagenta: '#f5c2e7', brightCyan: '#94e2d5', brightWhite: '#a6adc8',
    },
  },
  cobalt2: {
    theme: {
      background: '#132738', foreground: '#ffffff', cursor: '#f0f040',
      black: '#000000', red: '#ff5555', green: '#24c08b', yellow: '#fed900',
      blue: '#0d7bc0', magenta: '#f600f6', cyan: '#00b9f1', white: '#ffffff',
      brightBlack: '#555555', brightRed: '#ff7070', brightGreen: '#5ffa68', brightYellow: '#fffc67',
      brightBlue: '#6871ff', brightMagenta: '#f03dff', brightCyan: '#60fdff', brightWhite: '#ffffff',
    },
  },
  dracula: {
    theme: {
      background: '#282a36', foreground: '#f8f8f2', cursor: '#f8f8f2',
      black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
      blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
      brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5',
      brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff',
    },
  },
  'github-dark': {
    theme: {
      background: '#0d1117', foreground: '#c9d1d9', cursor: '#c9d1d9',
      black: '#484f58', red: '#ff7b72', green: '#3fb950', yellow: '#d29922',
      blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39c5cf', white: '#b1bac4',
      brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364', brightYellow: '#e3b341',
      brightBlue: '#79c0ff', brightMagenta: '#d2a8ff', brightCyan: '#56d4dd', brightWhite: '#ffffff',
    },
  },
  'github-light': {
    theme: {
      background: '#ffffff', foreground: '#24292e', cursor: '#24292e',
      black: '#24292e', red: '#d73a49', green: '#22863a', yellow: '#b08800',
      blue: '#0366d6', magenta: '#5a32a3', cyan: '#1b7c83', white: '#6a737d',
      brightBlack: '#959da5', brightRed: '#cb2431', brightGreen: '#176f2c', brightYellow: '#dbab09',
      brightBlue: '#005cc5', brightMagenta: '#5a32a3', brightCyan: '#3192aa', brightWhite: '#d1d5da',
    },
  },
  grass: {
    theme: {
      background: '#000000', foreground: '#00ff00', cursor: '#00ff00',
      black: '#000000', red: '#006600', green: '#00aa00', yellow: '#00dd00',
      blue: '#004400', magenta: '#00aa66', cyan: '#00cc88', white: '#00ff00',
      brightBlack: '#004400', brightRed: '#00cc00', brightGreen: '#00ff44', brightYellow: '#44ff44',
      brightBlue: '#00aa44', brightMagenta: '#00ffaa', brightCyan: '#44ffcc', brightWhite: '#aaffaa',
    },
  },
  'gruvbox-dark': {
    theme: {
      background: '#282828', foreground: '#ebdbb2', cursor: '#ebdbb2',
      black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
      blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984',
      brightBlack: '#928374', brightRed: '#fb4934', brightGreen: '#b8bb26', brightYellow: '#fabd2f',
      brightBlue: '#83a598', brightMagenta: '#d3869b', brightCyan: '#8ec07c', brightWhite: '#ebdbb2',
    },
  },
  'gruvbox-light': {
    theme: {
      background: '#fbf1c7', foreground: '#3c3836', cursor: '#3c3836',
      black: '#fbf1c7', red: '#cc241d', green: '#98971a', yellow: '#d79921',
      blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#7c6f64',
      brightBlack: '#928374', brightRed: '#9d0006', brightGreen: '#79740e', brightYellow: '#b57614',
      brightBlue: '#076678', brightMagenta: '#8f3f71', brightCyan: '#427b58', brightWhite: '#3c3836',
    },
  },
  homebrew: {
    theme: {
      background: '#000000', foreground: '#00ff00', cursor: '#00ff00',
      black: '#000000', red: '#c23621', green: '#25bc24', yellow: '#adad27',
      blue: '#492ee1', magenta: '#d338d3', cyan: '#33bbc8', white: '#cbcccd',
      brightBlack: '#818383', brightRed: '#fc391f', brightGreen: '#31e722', brightYellow: '#eaec23',
      brightBlue: '#5833ff', brightMagenta: '#f935f8', brightCyan: '#14f0f0', brightWhite: '#e9ebeb',
    },
  },
  light: {
    theme: {
      background: '#ffffff', foreground: '#383a42', cursor: '#383a42',
      black: '#383a42', red: '#e45649', green: '#50a14f', yellow: '#c18401',
      blue: '#0184bc', magenta: '#a626a4', cyan: '#0997b3', white: '#fafafa',
      brightBlack: '#4f525e', brightRed: '#e45649', brightGreen: '#50a14f', brightYellow: '#c18401',
      brightBlue: '#0184bc', brightMagenta: '#a626a4', brightCyan: '#0997b3', brightWhite: '#ffffff',
    },
  },
  'material-dark': {
    theme: {
      background: '#212121', foreground: '#eeffff', cursor: '#ffcc02',
      black: '#000000', red: '#f07178', green: '#c3e88d', yellow: '#ffcb6b',
      blue: '#82aaff', magenta: '#c792ea', cyan: '#89ddff', white: '#ffffff',
      brightBlack: '#546e7a', brightRed: '#ff5370', brightGreen: '#c3e88d', brightYellow: '#ffcb6b',
      brightBlue: '#82aaff', brightMagenta: '#c792ea', brightCyan: '#89ddff', brightWhite: '#eeffff',
    },
  },
  matrix: {
    theme: {
      background: '#000000', foreground: '#00ff41', cursor: '#00ff41',
      black: '#000000', red: '#003b00', green: '#007700', yellow: '#00bb00',
      blue: '#002200', magenta: '#005500', cyan: '#007744', white: '#00ff41',
      brightBlack: '#003300', brightRed: '#00cc33', brightGreen: '#00ff41', brightYellow: '#33ff66',
      brightBlue: '#00aa22', brightMagenta: '#00dd44', brightCyan: '#44ffaa', brightWhite: '#aaffcc',
    },
  },
  monokai: {
    theme: {
      background: '#272822', foreground: '#f8f8f2', cursor: '#f8f8f0',
      black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
      blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2',
      brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e', brightYellow: '#f4bf75',
      brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f9f8f5',
    },
  },
  'night-owl': {
    theme: {
      background: '#011627', foreground: '#d6deeb', cursor: '#80a4c2',
      black: '#1d3b53', red: '#fc514e', green: '#22da6e', yellow: '#ffd700',
      blue: '#82aaff', magenta: '#c792ea', cyan: '#21c7a8', white: '#a1aab8',
      brightBlack: '#7fdbca', brightRed: '#ff5874', brightGreen: '#22da6e', brightYellow: '#ffeb95',
      brightBlue: '#82aaff', brightMagenta: '#c792ea', brightCyan: '#7fdbca', brightWhite: '#d6deeb',
    },
  },
  nord: {
    theme: {
      background: '#2e3440', foreground: '#d8dee9', cursor: '#d8dee9',
      black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
      blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0',
      brightBlack: '#4c566a', brightRed: '#bf616a', brightGreen: '#a3be8c', brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1', brightMagenta: '#b48ead', brightCyan: '#8fbcbb', brightWhite: '#eceff4',
    },
  },
  novel: {
    theme: {
      background: '#dfdbc3', foreground: '#3b2322', cursor: '#3b2322',
      black: '#3b2322', red: '#c75646', green: '#8eb33b', yellow: '#d0b03c',
      blue: '#72b3cc', magenta: '#c8a0d1', cyan: '#218693', white: '#b5b5b5',
      brightBlack: '#5e5e5e', brightRed: '#fc5343', brightGreen: '#b3d24a', brightYellow: '#f7c33b',
      brightBlue: '#8fd4f0', brightMagenta: '#e8b8f0', brightCyan: '#3bc8a8', brightWhite: '#ffffff',
    },
  },
  ocean: {
    theme: {
      background: '#224f69', foreground: '#f0f0f0', cursor: '#ffffff',
      black: '#000000', red: '#cc2222', green: '#4e9a06', yellow: '#c4a000',
      blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
      brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
      brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec',
    },
  },
  ocean2: {
    theme: {
      background: '#0a1628', foreground: '#a8d8ea', cursor: '#56ccf2',
      black: '#0a1628', red: '#eb5757', green: '#27ae60', yellow: '#f2c94c',
      blue: '#2d9cdb', magenta: '#9b51e0', cyan: '#56ccf2', white: '#a8d8ea',
      brightBlack: '#1e3a5f', brightRed: '#ff7979', brightGreen: '#6fcf97', brightYellow: '#f9e784',
      brightBlue: '#56b4e9', brightMagenta: '#bb6bd9', brightCyan: '#81ecec', brightWhite: '#dff6ff',
    },
  },
  'one-dark': {
    theme: {
      background: '#282c34', foreground: '#abb2bf', cursor: '#528bff',
      black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
      blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
      brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b',
      brightBlue: '#61afef', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
    },
  },
  palenight: {
    theme: {
      background: '#292d3e', foreground: '#a6accd', cursor: '#a6accd',
      black: '#292d3e', red: '#f07178', green: '#c3e88d', yellow: '#ffcb6b',
      blue: '#82aaff', magenta: '#c792ea', cyan: '#89ddff', white: '#d0d0d0',
      brightBlack: '#434758', brightRed: '#ff8b92', brightGreen: '#ddffa7', brightYellow: '#ffe585',
      brightBlue: '#9cc4ff', brightMagenta: '#e1acff', brightCyan: '#a3f7ff', brightWhite: '#ffffff',
    },
  },
  'phosphor-blue': {
    theme: {
      background: '#000814', foreground: '#00b4ff', cursor: '#00b4ff',
      black: '#000814', red: '#004488', green: '#006699', yellow: '#0088bb',
      blue: '#003366', magenta: '#005577', cyan: '#0099cc', white: '#00b4ff',
      brightBlack: '#003366', brightRed: '#00aadd', brightGreen: '#00ccff', brightYellow: '#44ddff',
      brightBlue: '#0088cc', brightMagenta: '#22ccff', brightCyan: '#66ddff', brightWhite: '#aaeeff',
    },
  },
  'red-sands': {
    theme: {
      background: '#2e0d00', foreground: '#ffe7c7', cursor: '#ff8a00',
      black: '#000000', red: '#cc2222', green: '#4e9a06', yellow: '#c4a000',
      blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
      brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
      brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec',
    },
  },
  sakura: {
    theme: {
      background: '#1a0a14', foreground: '#ffb8d1', cursor: '#ff6ea7',
      black: '#2d1020', red: '#ff6ea7', green: '#b8e0a0', yellow: '#ffd0a0',
      blue: '#a0c0ff', magenta: '#ffb8d1', cyan: '#b0e8e8', white: '#f8d0e0',
      brightBlack: '#5a2040', brightRed: '#ff9cc0', brightGreen: '#d0f0b8', brightYellow: '#ffe8c0',
      brightBlue: '#c0d8ff', brightMagenta: '#ffd0e8', brightCyan: '#c8f0f0', brightWhite: '#fff0f5',
    },
  },
  slate: {
    theme: {
      background: '#1c2333', foreground: '#cdd9e5', cursor: '#cdd9e5',
      black: '#22272e', red: '#f47067', green: '#57ab5a', yellow: '#c69026',
      blue: '#539bf5', magenta: '#b083f0', cyan: '#39c5cf', white: '#909dab',
      brightBlack: '#444c56', brightRed: '#ff938a', brightGreen: '#6bc46d', brightYellow: '#daaa3f',
      brightBlue: '#6cb6ff', brightMagenta: '#dcbdfb', brightCyan: '#56d4dd', brightWhite: '#cdd9e5',
    },
  },
  snazzy: {
    theme: {
      background: '#282a36', foreground: '#eff0eb', cursor: '#97979b',
      black: '#282a36', red: '#ff5c57', green: '#5af78e', yellow: '#f3f99d',
      blue: '#57c7ff', magenta: '#ff6ac1', cyan: '#9aedfe', white: '#f1f1f0',
      brightBlack: '#686868', brightRed: '#ff5c57', brightGreen: '#5af78e', brightYellow: '#f3f99d',
      brightBlue: '#57c7ff', brightMagenta: '#ff6ac1', brightCyan: '#9aedfe', brightWhite: '#eff0eb',
    },
  },
  'solarized-dark': {
    theme: {
      background: '#002b36', foreground: '#839496', cursor: '#839496',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#002b36', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3',
    },
  },
  'solarized-light': {
    theme: {
      background: '#fdf6e3', foreground: '#657b83', cursor: '#586e75',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#002b36', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3',
    },
  },
  sunset: {
    theme: {
      background: '#1a0a00', foreground: '#ffcba4', cursor: '#ff8c42',
      black: '#1a0a00', red: '#ff4500', green: '#c8a400', yellow: '#ff8c00',
      blue: '#c45000', magenta: '#ff6b35', cyan: '#e8a000', white: '#ffcba4',
      brightBlack: '#5c2a00', brightRed: '#ff6b35', brightGreen: '#ffd700', brightYellow: '#ffaa44',
      brightBlue: '#ff8c42', brightMagenta: '#ff9966', brightCyan: '#ffcc44', brightWhite: '#ffe8cc',
    },
  },
  'tango-dark': {
    theme: {
      background: '#2e3436', foreground: '#d3d7cf', cursor: '#d3d7cf',
      black: '#2e3436', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000',
      blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
      brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
      brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec',
    },
  },
  'tango-light': {
    theme: {
      background: '#ffffff', foreground: '#2e3436', cursor: '#2e3436',
      black: '#2e3436', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000',
      blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
      brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
      brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec',
    },
  },
  'tokyo-night': {
    theme: {
      background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5',
      black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
      blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
      brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68',
      brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5',
    },
  },
  'tokyo-night-light': {
    theme: {
      background: '#d5d6db', foreground: '#343b58', cursor: '#343b58',
      black: '#343b58', red: '#8c4351', green: '#485e30', yellow: '#8f5e15',
      blue: '#34548a', magenta: '#5a4a78', cyan: '#0f4b6e', white: '#6172b0',
      brightBlack: '#717c9c', brightRed: '#8c4351', brightGreen: '#485e30', brightYellow: '#8f5e15',
      brightBlue: '#34548a', brightMagenta: '#5a4a78', brightCyan: '#0f4b6e', brightWhite: '#343b58',
    },
  },
  'tomorrow-night': {
    theme: {
      background: '#1d1f21', foreground: '#c5c8c6', cursor: '#c5c8c6',
      black: '#1d1f21', red: '#cc6666', green: '#b5bd68', yellow: '#f0c674',
      blue: '#81a2be', magenta: '#b294bb', cyan: '#8abeb7', white: '#c5c8c6',
      brightBlack: '#969896', brightRed: '#cc6666', brightGreen: '#b5bd68', brightYellow: '#f0c674',
      brightBlue: '#81a2be', brightMagenta: '#b294bb', brightCyan: '#8abeb7', brightWhite: '#ffffff',
    },
  },
  zenburn: {
    theme: {
      background: '#3f3f3f', foreground: '#dcdccc', cursor: '#dcdccc',
      black: '#4d4d4d', red: '#d78787', green: '#7f9f7f', yellow: '#e3ceab',
      blue: '#7cb8bb', magenta: '#dc8cc3', cyan: '#93e0e3', white: '#dcdccc',
      brightBlack: '#6f6f6f', brightRed: '#dca3a3', brightGreen: '#bfebbf', brightYellow: '#f0dfaf',
      brightBlue: '#8cd0d3', brightMagenta: '#fcace3', brightCyan: '#b3f0f3', brightWhite: '#ffffff',
    },
  },
};

const DEFAULT_CONFIG: VaultTerminalConfig = {
  version: '1.0.0',
  vaultRoot: true,
  scriptFolder: '.vault-terminal/scripts',
  locale: 'system',
  terminalOptions: { fontSize: 12, scrollback: 1000 },
  profiles: {
    basic: PREDEFINED_PROFILES['basic'],
  },
  defaultProfile: 'basic',
  env: {},
  addToNote: { lines: 200, askLines: true },
  history: { mode: 'none' },
  actions: [],
  toolbar: [],
  pathPatterns: {
    enabled: true,
    patterns: [
      { name: 'relative', regex: '\\.\\/.+(\\.\\w+)?' },
      { name: 'filename', regex: '[\\w\\-. ]+\\.(md|txt|yaml|json|sh)' },
    ],
  },
};

export class ConfigManager {
  private config: VaultTerminalConfig = { ...DEFAULT_CONFIG };
  private listeners: Array<() => void> = [];

  constructor(private readonly app: App) {}

  onChanged(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  async load(): Promise<void> {
    const adapter = this.app.vault.adapter;
    const exists = await adapter.exists(CONFIG_PATH);
    if (!exists) {
      await this.createDefault();
      return;
    }
    try {
      const raw = await adapter.read(CONFIG_PATH);
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      new Notice('vault-terminal: Failed to parse config.json, using defaults.');
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  get(): Readonly<VaultTerminalConfig> {
    return this.config;
  }

  update(partial: Partial<VaultTerminalConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  async save(): Promise<void> {
    const content = JSON.stringify(this.config, null, 2);
    const adapter = this.app.vault.adapter;
    const dir = CONFIG_PATH.split('/')[0];
    if (!(await adapter.exists(dir))) {
      await adapter.mkdir(dir);
    }
    await adapter.write(CONFIG_PATH, content);
    for (const cb of this.listeners) cb();
  }

  getActions(): ActionDef[] {
    return this.config.actions ?? [];
  }

  getToolbarActionIds(): string[] {
    return this.config.toolbar ?? [];
  }

  getToolbarActions(): ActionDef[] {
    const actions = this.getActions();
    return this.getToolbarActionIds()
      .map((id) => actions.find((a) => a.id === id))
      .filter((a): a is ActionDef => a !== undefined);
  }

  getVaultRoot(): string {
    const { adapter } = this.app.vault;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return process.cwd();
  }

  getScriptFolder(): string {
    return this.config.scriptFolder ?? '.vault-terminal/scripts';
  }

  private async createDefault(): Promise<void> {
    const dir = '.vault-terminal';
    if (!this.app.vault.getAbstractFileByPath(dir)) {
      await this.app.vault.createFolder(dir);
    }
    await this.app.vault.create(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}
