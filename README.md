# Vault Terminal

Vault Terminal is a terminal plugin for [Obsidian](https://obsidian.md) that embeds a fully functional shell directly in your vault, with Obsidian-aware features built in.

It is a learning-oriented plugin project developed with AI-assisted coding workflows, exploring shell workflows that are aware of the current vault, notes, and links.

## Features

- **Embedded terminal** — full PTY shell inside Obsidian on macOS/Linux and Windows x64/ARM64
- **Wikilink detection** — `[[links]]` in terminal output become clickable, opening the note directly
- **File drag & drop** — drag files from the OS or Obsidian's file explorer into the terminal to insert the path
- **Action buttons** — configurable toolbar buttons that send templated commands or run scripts with parameters
- **Vault context** — actions can auto-fill the current note path or selected text as command parameters

## Installation

> Not yet available on the Obsidian Community Plugin marketplace.

1. Download `main.js`, `manifest.json`, `styles.css`, and `python/` from the latest release
2. Copy them to `<vault>/.obsidian/plugins/vault-terminal/`
3. Enable the plugin in Obsidian → Settings → Community plugins

## Usage

Open the terminal via the ribbon icon or command palette (`Open Vault Terminal`).

### Action Buttons

Configure custom toolbar buttons in the plugin settings. The underlying shape is:

```json
{
  "actions": [
    {
      "id": "find-files",
      "label": "Find Files",
      "icon": "search",
      "mode": "template",
      "command": "find . -name {pattern}",
      "params": [{ "name": "pattern", "placeholder": "e.g. *.md" }]
    }
  ],
  "toolbar": ["find-files"]
}
```

### Wikilinks

Any `[[note]]` output by a command (e.g. from an AI tool or script) is rendered as a clickable link that opens the note in Obsidian.

### File Drag & Drop

Drag files from Finder/Explorer or the Obsidian file explorer into the terminal. The shell-escaped absolute path is inserted at the cursor.

## Requirements

- Obsidian 0.15.0+
- Desktop only (macOS, Linux, Windows)

## License

MIT
