#!/usr/bin/env node
// Downloads the netcoredbg binary for the current platform into bin/<platform>-<arch>/.
// Uses only Node.js built-ins and system archive tools (tar/unzip).

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.join(scriptDir, '..');
const binRoot = path.join(extensionRoot, 'bin');
const force = process.argv.includes('--force');

const platformKey = `${process.platform}-${process.arch}`;

// darwin-arm64 is not published by Samsung/netcoredbg, so it comes from a
// community build. Asset lists are ordered: first match wins, which keeps the
// script working across the old (x64/win-x64) and new (amd64/win64) naming
// schemes used by Samsung/netcoredbg releases.
const SOURCES = {
	'darwin-arm64': {
		repo: 'Cliffback/netcoredbg-macOS-arm64.nvim',
		assets: ['netcoredbg-osx-arm64.tar.gz', 'netcoredbg-osx-arm64.zip']
	},
	'darwin-x64': {
		repo: 'Samsung/netcoredbg',
		assets: ['netcoredbg-osx-x64.tar.gz', 'netcoredbg-osx-x64.zip']
	},
	'linux-x64': {
		repo: 'Samsung/netcoredbg',
		assets: ['netcoredbg-linux-amd64.tar.gz', 'netcoredbg-linux-x64.tar.gz']
	},
	'linux-arm64': {
		repo: 'Samsung/netcoredbg',
		assets: ['netcoredbg-linux-arm64.tar.gz']
	},
	'win32-x64': {
		repo: 'Samsung/netcoredbg',
		assets: ['netcoredbg-win64.zip', 'netcoredbg-win-x64.zip', 'netcoredbg-win-x64.tar.gz']
	}
};

function fail(message) {
	console.error(`[fetch-netcoredbg] ${message}`);
	process.exit(1);
}

async function fetchJson(url) {
	const response = await fetch(url, {
		headers: {
			'user-agent': 'semafour-dotnet-debug',
			accept: 'application/vnd.github+json'
		}
	});
	if (!response.ok) {
		fail(`GET ${url} failed with HTTP ${response.status} ${response.statusText}`);
	}
	return response.json();
}

async function download(url, destination) {
	const response = await fetch(url, {
		headers: { 'user-agent': 'semafour-dotnet-debug' }
	});
	if (!response.ok) {
		fail(`GET ${url} failed with HTTP ${response.status} ${response.statusText}`);
	}
	writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function extract(archive, destination) {
	if (archive.endsWith('.tar.gz') || archive.endsWith('.tgz')) {
		execFileSync('tar', ['-xzf', archive, '-C', destination], { stdio: 'inherit' });
	} else if (archive.endsWith('.zip')) {
		if (process.platform === 'linux') {
			execFileSync('unzip', ['-o', '-q', archive, '-d', destination], { stdio: 'inherit' });
		} else {
			// bsdtar on macOS/Windows handles zip archives.
			execFileSync('tar', ['-xf', archive, '-C', destination], { stdio: 'inherit' });
		}
	} else {
		fail(`Unsupported archive format: ${archive}`);
	}
}

function findFiles(dir, predicate) {
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findFiles(full, predicate));
		} else if (predicate(entry.name, full)) {
			results.push(full);
		}
	}
	return results;
}

function chmodExecutable(file) {
	try {
		chmodSync(file, 0o755);
	} catch {
		// Best effort: some filesystems (e.g. Windows) do not support chmod.
	}
}

async function main() {
	const source = SOURCES[platformKey];
	if (!source) {
		fail(`Unsupported platform: ${platformKey}. Supported: ${Object.keys(SOURCES).join(', ')}`);
	}

	const targetDir = path.join(binRoot, platformKey);
	const binaryName = process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg';
	const targetBinary = path.join(targetDir, binaryName);

	if (existsSync(targetBinary) && !force) {
		console.log(`[fetch-netcoredbg] ${targetBinary} already present. Use --force to re-download.`);
		return;
	}

	console.log(`[fetch-netcoredbg] Fetching netcoredbg for ${platformKey} from ${source.repo}...`);
	const release = await fetchJson(`https://api.github.com/repos/${source.repo}/releases/latest`);
	const assets = release.assets ?? [];
	const asset = assets.find(a => source.assets.includes(a.name));
	if (!asset) {
		fail(`None of the expected assets [${source.assets.join(', ')}] found in ${source.repo} release ${release.tag_name ?? 'unknown'}. Available: ${assets.map(a => a.name).join(', ')}`);
	}

	const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'netcoredbg-'));
	try {
		const archivePath = path.join(tmpDir, asset.name);
		console.log(`[fetch-netcoredbg] Downloading ${asset.name} (${release.tag_name})...`);
		await download(asset.browser_download_url, archivePath);

		const extractDir = path.join(tmpDir, 'extract');
		mkdirSync(extractDir, { recursive: true });
		extract(archivePath, extractDir);

		const extractedBinary = findFiles(extractDir, name => name === binaryName)[0];
		if (!extractedBinary) {
			fail(`Expected ${binaryName} inside ${asset.name} but could not find it.`);
		}

		// Archives may nest the payload in a top-level folder; install the
		// binary's own directory so the .dylib/.dll siblings land next to it.
		rmSync(targetDir, { recursive: true, force: true });
		mkdirSync(targetDir, { recursive: true });
		cpSync(path.dirname(extractedBinary), targetDir, { recursive: true });

		chmodExecutable(path.join(targetDir, binaryName));
		for (const dylib of findFiles(targetDir, name => name.endsWith('.dylib'))) {
			chmodExecutable(dylib);
		}

		if (process.platform === 'darwin') {
			console.log('[fetch-netcoredbg] Removing com.apple.quarantine attribute...');
			execFileSync('xattr', ['-dr', 'com.apple.quarantine', targetDir], { stdio: 'inherit' });
		}

		console.log(`[fetch-netcoredbg] Installed ${path.join(targetDir, binaryName)}`);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

main().catch(err => fail(err?.stack ?? String(err)));
