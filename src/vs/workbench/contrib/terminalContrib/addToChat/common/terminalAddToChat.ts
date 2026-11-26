/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const enum TerminalAddToChatCommandId {
	AddSelectionToChat = 'workbench.action.terminal.addSelectionToChat',
}

export const addTerminalSelectionToChatExtensionCommandId = 'kilo-code.new.terminalAddToContext';

export const defaultTerminalAddToChatCommandsToSkipShell = [
	TerminalAddToChatCommandId.AddSelectionToChat,
];

export interface AddTerminalSelectionPayload {
	readonly text: string;
	readonly terminalName?: string;
}

export function createAddTerminalSelectionPayload(selection: string | undefined, terminalName: string | undefined): AddTerminalSelectionPayload | undefined {
	if (selection === undefined || selection.trim().length === 0) {
		return undefined;
	}
	if (terminalName === undefined) {
		return { text: selection };
	}
	return { text: selection, terminalName };
}
