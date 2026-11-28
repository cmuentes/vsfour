import * as fs from 'fs';
import * as path from 'path';

export interface LaunchSettingsProfile {
	commandName?: string;
	commandLineArgs?: string;
	workingDirectory?: string;
	applicationUrl?: string;
	environmentVariables?: Record<string, string>;
	launchBrowser?: boolean;
	inspectUrl?: string;
}

export interface LaunchSettings {
	profiles?: Record<string, LaunchSettingsProfile>;
}

export interface ResolvedProfile {
	name: string;
	profile: LaunchSettingsProfile;
}

/**
 * Strips // and block comments from JSONC text while preserving string literals.
 */
export function stripJsonComments(text: string): string {
	let result = '';
	let inString = false;
	let escaped = false;
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		const next = text[i + 1];
		if (inString) {
			result += ch;
			if (escaped) {
				escaped = false;
			} else if (ch === '\\') {
				escaped = true;
			} else if (ch === '"') {
				inString = false;
			}
			i++;
		} else if (ch === '"') {
			inString = true;
			result += ch;
			i++;
		} else if (ch === '/' && next === '/') {
			while (i < text.length && text[i] !== '\n') {
				i++;
			}
		} else if (ch === '/' && next === '*') {
			i += 2;
			while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
				i++;
			}
			i += 2;
		} else {
			result += ch;
			i++;
		}
	}
	return result;
}

/**
 * Reads and parses a Properties/launchSettings.json file. Returns undefined when
 * the file is missing or cannot be parsed.
 */
export function parseLaunchSettings(filePath: string): LaunchSettings | undefined {
	try {
		const raw = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(stripJsonComments(raw)) as LaunchSettings;
	} catch {
		return undefined;
	}
}

/**
 * Finds the profile matching the launch configuration name, falling back to the
 * profile whose commandName is "Project".
 */
export function findProfile(settings: LaunchSettings, configName: string): ResolvedProfile | undefined {
	const profiles = settings.profiles;
	if (!profiles) {
		return undefined;
	}
	const byName = profiles[configName];
	if (byName) {
		return { name: configName, profile: byName };
	}
	for (const [name, profile] of Object.entries(profiles)) {
		if (profile.commandName === 'Project') {
			return { name, profile };
		}
	}
	return undefined;
}

const KNOWN_ENVIRONMENTS = new Set(['development', 'staging', 'production']);

/**
 * Merges a launchSettings.json profile into a launch configuration. Values
 * already present in the configuration always win over the profile.
 */
export function applyProfileToConfig(config: Record<string, any>, resolved: ResolvedProfile, projectDir: string): void {
	const { profile } = resolved;
	const env: Record<string, string> = { ...(config.env ?? {}) as Record<string, string> };

	if (profile.applicationUrl && env['ASPNETCORE_URLS'] === undefined) {
		env['ASPNETCORE_URLS'] = profile.applicationUrl;
	}
	if (KNOWN_ENVIRONMENTS.has(resolved.name.toLowerCase()) && env['ASPNETCORE_ENVIRONMENT'] === undefined) {
		env['ASPNETCORE_ENVIRONMENT'] = resolved.name;
	}
	for (const [key, value] of Object.entries(profile.environmentVariables ?? {})) {
		if (env[key] === undefined) {
			env[key] = String(value);
		}
	}
	config.env = env;

	if (config.args === undefined && profile.commandLineArgs) {
		config.args = splitCommandLineArgs(profile.commandLineArgs);
	}
	if (config.cwd === undefined && profile.workingDirectory) {
		config.cwd = resolveWorkingDirectory(profile.workingDirectory, projectDir);
	}
}

function splitCommandLineArgs(args: string): string[] {
	const result: string[] = [];
	let current = '';
	let quote: string | undefined;
	for (const ch of args) {
		if (quote) {
			if (ch === quote) {
				quote = undefined;
			} else {
				current += ch;
			}
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === ' ' || ch === '\t') {
			if (current) {
				result.push(current);
				current = '';
			}
		} else {
			current += ch;
		}
	}
	if (current) {
		result.push(current);
	}
	return result;
}

function resolveWorkingDirectory(workingDirectory: string, projectDir: string): string {
	const substituted = workingDirectory.replace(/\$\{ProjectDir\}/g, projectDir);
	return path.isAbsolute(substituted) ? substituted : path.resolve(projectDir, substituted);
}
