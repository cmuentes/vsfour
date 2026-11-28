import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { applyProfileToConfig, findProfile, parseLaunchSettings } from './launchSettings';

const DEBUGGER_TYPE = 'coreclr';
const EXCLUDED_DIRS = new Set(['bin', 'obj', 'node_modules', '.git', '.vs', '.vscode', '.idea']);
const MAX_PROJECT_SEARCH_DEPTH = 3;

export function activate(context: vscode.ExtensionContext): void {
	const output = vscode.window.createOutputChannel('Semafour .NET Debug');
	context.subscriptions.push(output);

	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory(
			DEBUGGER_TYPE,
			new NetCoreDbgAdapterFactory(context.extensionPath, output)
		)
	);
	context.subscriptions.push(
		vscode.debug.registerDebugConfigurationProvider(
			DEBUGGER_TYPE,
			new NetCoreDebugConfigurationProvider(output),
			vscode.DebugConfigurationProviderTriggerKind.Initial
		)
	);
}

class NetCoreDbgAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	constructor(
		private readonly extensionPath: string,
		private readonly output: vscode.OutputChannel
	) { }

	createDebugAdapterDescriptor(): vscode.DebugAdapterDescriptor {
		const binaryPath = resolveNetCoreDbgPath(this.extensionPath);
		if (!binaryPath) {
			throw new Error(
				'netcoredbg was not found. Run "npm run fetch-debugger" in extensions/semafour-dotnet-debug to download the debugger binary.'
			);
		}
		this.output.appendLine(`Using netcoredbg: ${binaryPath}`);
		return new vscode.DebugAdapterExecutable(binaryPath, ['--interpreter=vscode']);
	}
}

function resolveNetCoreDbgPath(extensionPath: string): string | undefined {
	const platformKey = `${process.platform}-${process.arch}`;
	const binaryName = process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg';
	const candidate = path.join(extensionPath, 'bin', platformKey, binaryName);
	return fs.existsSync(candidate) ? candidate : undefined;
}

class NetCoreDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	constructor(private readonly output: vscode.OutputChannel) { }

	provideDebugConfigurations(): vscode.DebugConfiguration[] {
		return [
			{
				type: DEBUGGER_TYPE,
				name: '.NET Core (Semafour): Launch project',
				request: 'launch'
			}
		];
	}

	async resolveDebugConfiguration(
		folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration
	): Promise<vscode.DebugConfiguration | undefined> {
		if (config.type && config.type !== DEBUGGER_TYPE) {
			return undefined;
		}
		if (!config.request) {
			config.request = 'launch';
		}
		if (config.request !== 'launch') {
			return config;
		}
		if (config.noDebug === undefined) {
			config.noDebug = false;
		}

		const projectPath = this.resolveProjectPath(folder, config);
		if (!projectPath) {
			if (!config.program) {
				this.output.appendLine('No .csproj found. Set "project" (or "program") in the launch configuration.');
				return undefined;
			}
			this.output.appendLine(`No project found; using explicit program: ${config.program}`);
			return config;
		}
		const projectDir = path.dirname(projectPath);
		this.output.appendLine(`Using project: ${projectPath}`);

		const targetFramework = readTargetFramework(projectPath);
		if (!targetFramework) {
			throw new Error(`Could not determine <TargetFramework> from ${projectPath}.`);
		}
		const assemblyName = readAssemblyName(projectPath)
			?? path.basename(projectPath, path.extname(projectPath));

		if (!config.program) {
			config.program = path.join(projectDir, 'bin', 'Debug', targetFramework, `${assemblyName}.dll`);
		}
		if (!config.cwd) {
			config.cwd = projectDir;
		}

		if (config.preLaunchTask) {
			this.output.appendLine(`Using preLaunchTask "${config.preLaunchTask}" (skipping auto-build).`);
		} else {
			await this.buildProject(projectPath);
		}

		this.applyLaunchSettings(config, projectDir);

		return config;
	}

	private resolveProjectPath(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): string | undefined {
		if (typeof config.project === 'string' && config.project.length > 0) {
			// VS Code delivers the raw configuration before its own variable
			// resolution, so ${workspaceFolder} must be substituted here for
			// any file-system access.
			const root = folder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (root) {
				config.project = config.project
					.replace(/\$\{workspaceFolder\}/g, root)
					.replace(/\$\{workspaceFolderBasename\}/g, path.basename(root));
			}
			return config.project;
		}
		const searchRoot = folder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!searchRoot) {
			return undefined;
		}
		return findCsproj(searchRoot);
	}

	private applyLaunchSettings(config: vscode.DebugConfiguration, projectDir: string): void {
		const settingsPath = path.join(projectDir, 'Properties', 'launchSettings.json');
		const settings = parseLaunchSettings(settingsPath);
		if (!settings) {
			return;
		}
		const resolved = findProfile(settings, config.name ?? '');
		if (!resolved) {
			return;
		}
		applyProfileToConfig(config, resolved, projectDir);
		this.output.appendLine(`Merged launchSettings.json profile "${resolved.name}".`);
	}

	private async buildProject(projectPath: string): Promise<void> {
		this.output.appendLine(`Running: dotnet build "${projectPath}"`);
		this.output.show();
		await new Promise<void>((resolve, reject) => {
			const child = spawn('dotnet', ['build', projectPath, '--nologo'], {
				cwd: path.dirname(projectPath),
				env: process.env
			});
			child.stdout.on('data', (chunk: Buffer) => this.output.append(chunk.toString()));
			child.stderr.on('data', (chunk: Buffer) => this.output.append(chunk.toString()));
			child.on('error', (error) => reject(new Error(`Failed to start 'dotnet build': ${error.message}`)));
			child.on('close', (code) => {
				if (code === 0) {
					this.output.appendLine('Build succeeded.');
					resolve();
				} else {
					reject(new Error(`'dotnet build' failed with exit code ${code}. See the "Semafour .NET Debug" output channel.`));
				}
			});
		});
	}
}

function readTargetFramework(projectPath: string): string | undefined {
	let text: string;
	try {
		text = fs.readFileSync(projectPath, 'utf8');
	} catch {
		return undefined;
	}
	const single = text.match(/<TargetFramework\s*>([^<]+)<\/TargetFramework>/i);
	if (single) {
		return single[1].trim();
	}
	const multi = text.match(/<TargetFrameworks\s*>([^<]+)<\/TargetFrameworks>/i);
	if (multi) {
		const first = multi[1].split(';')[0]?.trim();
		return first || undefined;
	}
	return undefined;
}

function readAssemblyName(projectPath: string): string | undefined {
	try {
		const text = fs.readFileSync(projectPath, 'utf8');
		const match = text.match(/<AssemblyName\s*>([^<]+)<\/AssemblyName>/i);
		return match ? match[1].trim() : undefined;
	} catch {
		return undefined;
	}
}

function findCsproj(root: string, depth: number = 0): string | undefined {
	if (depth > MAX_PROJECT_SEARCH_DEPTH) {
		return undefined;
	}
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(root, { withFileTypes: true });
	} catch {
		return undefined;
	}
	const projects: string[] = [];
	for (const entry of entries) {
		if (entry.isFile() && entry.name.toLowerCase().endsWith('.csproj')) {
			projects.push(path.join(root, entry.name));
		}
	}
	if (projects.length > 0) {
		return projects.sort()[0];
	}
	for (const entry of entries) {
		if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
			const found = findCsproj(path.join(root, entry.name), depth + 1);
			if (found) {
				return found;
			}
		}
	}
	return undefined;
}
