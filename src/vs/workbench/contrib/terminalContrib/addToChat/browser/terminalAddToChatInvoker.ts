/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { addTerminalSelectionToChatExtensionCommandId, createAddTerminalSelectionPayload } from '../common/terminalAddToChat.js';

export interface ITerminalSelectionSource {
	readonly selection: string | undefined;
	readonly title: string;
}

const hideHandlers = new Map<number, () => void>();

export function setTerminalAddToChatHideHandler(instanceId: number, hide: () => void): { dispose(): void } {
	hideHandlers.set(instanceId, hide);
	return toDisposable(() => {
		if (hideHandlers.get(instanceId) === hide) {
			hideHandlers.delete(instanceId);
		}
	});
}

export function hideTerminalAddToChat(instanceId: number): void {
	hideHandlers.get(instanceId)?.();
}

export async function addTerminalSelectionToChat(source: ITerminalSelectionSource, commandService: ICommandService, logService: ILogService): Promise<void> {
	const payload = createAddTerminalSelectionPayload(source.selection, source.title);
	if (!payload) {
		return;
	}
	try {
		await commandService.executeCommand(addTerminalSelectionToChatExtensionCommandId, { selection: payload.text });
	} catch (error) {
		logService.warn('Failed to add terminal selection to chat', error);
	}
}
