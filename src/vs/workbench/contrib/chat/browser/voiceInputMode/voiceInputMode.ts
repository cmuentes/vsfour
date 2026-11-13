/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable, observableValue } from '../../../../../base/common/observable.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';

export type SimulatedVoiceState = 'idle' | 'listening' | 'speaking' | 'off' | 'connecting' | 'dictating';

export const IVoiceInputModeService = createDecorator<IVoiceInputModeService>('voiceInputModeService');

export interface IVoiceInputModeService {
	readonly _serviceBrand: undefined;
	readonly simulatedVoiceState: IObservable<SimulatedVoiceState | undefined>;
	readonly simulatedVersion: IObservable<string | undefined>;
}

export class VoiceInputModeService implements IVoiceInputModeService {
	declare readonly _serviceBrand: undefined;
	readonly simulatedVoiceState = observableValue<SimulatedVoiceState | undefined>(this, undefined);
	readonly simulatedVersion = observableValue<string | undefined>(this, undefined);
}

registerSingleton(IVoiceInputModeService, VoiceInputModeService, InstantiationType.Delayed);
