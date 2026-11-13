/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IVoiceModelSelectionResult {
	readonly ok: boolean;
	readonly reason?: string;
	readonly identifier?: string;
	readonly available_models?: readonly string[];
}

export function resolveVoiceModel(_models: unknown, _requestedModel: string): IVoiceModelSelectionResult {
	return { ok: false, reason: 'unavailable' };
}
