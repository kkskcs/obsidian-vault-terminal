import fs from "fs";
import path from "path";

const pluginId = "obsidian-vault-terminal";
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const distDir = path.join(repoRoot, "dist");
const requiredEntries = ["main.js", "styles.css", "manifest.json", "python"];

function usage() {
	console.error('Usage: npm run link-vault -- "/path/to/vault" [...more vaults]');
	process.exit(1);
}

function resolveVaultPath(input) {
	if (input.startsWith("~/")) {
		return path.join(process.env.HOME ?? "", input.slice(2));
	}
	return path.resolve(input);
}

function assertDistReady() {
	for (const entry of requiredEntries) {
		const fullPath = path.join(distDir, entry);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`dist 산출물이 없습니다: ${fullPath}\n먼저 npm run build 를 실행하세요.`);
		}
	}
}

function replaceSymlink(target, source) {
	fs.rmSync(target, { recursive: true, force: true });
	const stat = fs.statSync(source);
	fs.symlinkSync(source, target, stat.isDirectory() ? "dir" : "file");
}

function linkVault(vaultInput) {
	const vaultPath = resolveVaultPath(vaultInput);
	if (!fs.existsSync(vaultPath)) {
		throw new Error(`vault 경로가 없습니다: ${vaultPath}`);
	}

	const obsidianDir = path.join(vaultPath, ".obsidian");
	if (!fs.existsSync(obsidianDir)) {
		throw new Error(`Obsidian vault가 아닙니다. .obsidian 폴더가 없습니다: ${vaultPath}`);
	}

	const pluginDir = path.join(obsidianDir, "plugins", pluginId);
	fs.mkdirSync(pluginDir, { recursive: true });

	for (const entry of requiredEntries) {
		replaceSymlink(path.join(pluginDir, entry), path.join(distDir, entry));
	}

	console.log(`Linked ${pluginId} -> ${pluginDir}`);
}

const vaults = process.argv.slice(2);
if (vaults.length === 0) {
	usage();
}

assertDistReady();
for (const vault of vaults) {
	linkVault(vault);
}
