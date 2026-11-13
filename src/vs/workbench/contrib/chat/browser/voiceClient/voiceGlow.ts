/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function readVoiceGlowIntensity(_analyser: AnalyserNode | null, _samples: { value: Uint8Array | undefined }): number {
	return 0;
}

export function resolveVoiceGlowColors(_theme: unknown): undefined {
	return undefined;
}

export function shouldRenderVoiceInputGlow(_connected: boolean, _enabled: boolean, _owner: boolean): boolean {
	return false;
}
