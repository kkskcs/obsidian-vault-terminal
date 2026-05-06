import { Plugin } from 'obsidian';

export default class VaultTerminalPlugin extends Plugin {
	async onload() {
		console.log('VaultTerminalPlugin loaded');
	}

	onunload() {
		console.log('VaultTerminalPlugin unloaded');
	}
}
