/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable, observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';

export interface IVoiceTranscriptTurn {
	readonly text: string;
	readonly speaker: string;
	readonly isPartial: boolean;
	readonly committed?: string;
}

export const IVoiceSessionController = createDecorator<IVoiceSessionController>('voiceSessionController');

export interface IVoiceSessionController {
	readonly _serviceBrand: undefined;
	readonly targetSession: IObservable<URI | undefined>;
	readonly voiceState: IObservable<string>;
	readonly isConnected: IObservable<boolean>;
	readonly isMuted: IObservable<boolean>;
	readonly transcriptTurns: IObservable<readonly IVoiceTranscriptTurn[]>;
	finishListeningAndSubmitTo(session: URI): void;
	discardListening(): void;
}

export class VoiceSessionController implements IVoiceSessionController {
	declare readonly _serviceBrand: undefined;
	readonly targetSession = observableValue<URI | undefined>(this, undefined);
	readonly voiceState = observableValue(this, 'idle');
	readonly isConnected = observableValue(this, false);
	readonly isMuted = observableValue(this, false);
	readonly transcriptTurns = observableValue<readonly IVoiceTranscriptTurn[]>(this, []);

	finishListeningAndSubmitTo(_session: URI): void { }

	discardListening(): void { }
}

registerSingleton(IVoiceSessionController, VoiceSessionController, InstantiationType.Delayed);
