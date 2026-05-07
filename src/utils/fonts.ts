// Fallback font list (Windows + macOS system fonts, sourced from Obsidian)
const FALLBACK_FONTS = [
  'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black', 'Arial Narrow',
  'Arial Rounded MT Bold', 'Arial Unicode MS', 'Avenir', 'Avenir Next',
  'Avenir Next Condensed', 'Bahnschrift', 'Baskerville', 'Big Caslon',
  'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bradley Hand',
  'Brush Script MT', 'Calibri', 'Cambria', 'Cambria Math', 'Candara',
  'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin',
  'Comic Sans MS', 'Consolas', 'Constantia', 'Copperplate', 'Corbel',
  'Courier', 'Courier New', 'Didot', 'DIN Alternate', 'DIN Condensed',
  'Ebrima', 'Franklin Gothic Medium', 'Futura', 'Gabriola', 'Gadugi',
  'Geneva', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue',
  'Herculanum', 'Hoefler Text', 'HoloLens MDL2 Assets', 'Impact', 'Ink Free',
  'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Grande',
  'Lucida Sans Unicode', 'Luminari', 'Malgun Gothic', 'Marker Felt', 'Marlett',
  'Menlo', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue',
  'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le',
  'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Monaco',
  'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI',
  'Noteworthy', 'Optima', 'Palatino', 'Palatino Linotype', 'Papyrus',
  'Phosphate', 'Rockwell', 'Savoye LET', 'Segoe MDL2 Assets', 'Segoe Print',
  'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic',
  'Segoe UI Symbol', 'SignPainter', 'SimSun', 'Sitka', 'Skia',
  'Snell Roundhand', 'Symbol', 'Sylfaen', 'Tahoma', 'Times', 'Times New Roman',
  'Trattatello', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings',
  'Yu Gothic', 'Zapfino',
];

let cachedFonts: string[] | null = null;

export async function getSystemFonts(): Promise<string[]> {
  if (cachedFonts) return cachedFonts;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getFontsModule = require('get-fonts') as { getFonts(): unknown };
    const result = getFontsModule.getFonts();
    if (Array.isArray(result) && result.length > 0) {
      cachedFonts = [...new Set(result as string[])].sort();
      return cachedFonts;
    }
  } catch {
    // fall through to fallback
  }
  cachedFonts = FALLBACK_FONTS;
  return cachedFonts;
}
