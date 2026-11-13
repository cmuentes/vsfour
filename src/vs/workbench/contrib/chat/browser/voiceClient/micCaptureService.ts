/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';

export const IMicCaptureService = createDecorator<IMicCaptureService>('micCaptureService');

export interface IMicCaptureService {
	readonly _serviceBrand: undefined;
	readonly analyserNode: AnalyserNode | null;
}

export class MicCaptureService implements IMicCaptureService {
	declare readonly _serviceBrand: undefined;
	readonly analyserNode = null;
}

registerSingleton(IMicCaptureService, MicCaptureService, InstantiationType.Delayed);
