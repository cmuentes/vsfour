/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposable } from '../../../../../base/common/lifecycle.js';

export class VoiceGlowController implements IDisposable {
	refreshTheme(): void { }

	clear(): void { }

	render(_intensity: number, _reducedMotion: boolean): void { }

	dispose(): void { }
}

export function createVoiceGlowController(_container: HTMLElement, _themeKind: () => string, _colors: () => unknown): VoiceGlowController {
	return new VoiceGlowController();
}
