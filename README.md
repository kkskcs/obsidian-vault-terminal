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

Not yet available on the Obsidian Community Plugin marketplace.

## Usage

Open the terminal via the ribbon icon or command palette (`Open Vault Terminal`).

### Runtime Status

Open `Settings > Vault Terminal > Runtime` to check the detected Python backend and set a custom Python path.

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

## Runtime Setup

Vault Terminal uses a Python helper to create PTY shell sessions.

If the terminal cannot start, Vault Terminal shows a runtime dialog with a shortcut to the Runtime settings tab and this setup guide.

Python is resolved in this order:

1. `Settings > Vault Terminal > Runtime > Python path`
2. `VAULT_TERMINAL_PYTHON` environment variable
3. `python3` on all platforms

### macOS

Install Python 3, then reopen Obsidian and try again.

```sh
xcode-select --install
```

Alternatives:

```sh
brew install python
```

### Linux

Install Python 3 with your distribution package manager, then reopen Obsidian and try again.

```sh
sudo apt install python3
```

```sh
sudo dnf install python3
```

```sh
sudo pacman -S python
```

### Windows

Install Python 3 using the Python Install Manager from [python.org](https://www.python.org/downloads/), then install pywinpty and reopen Obsidian.

```powershell
winget install Python.PythonInstallManager
python3 -m pip install pywinpty
```

If you have a legacy Python install (3.13 or earlier) that only provides `py`, open `Settings > Vault Terminal > Runtime` and set the Python path to `py`.

## License

MIT
