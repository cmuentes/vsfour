/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from '../../../../../base/common/keyCodes.js';
import { localize2 } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingWeight } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { TerminalAddToChatCommandId } from '../common/terminalAddToChat.js';
import { addTerminalSelectionToChat, hideTerminalAddToChat } from './terminalAddToChatInvoker.js';

const terminalSelectionWhen = ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.textSelected);

registerActiveInstanceAction({
	id: TerminalAddToChatCommandId.AddSelectionToChat,
	title: localize2('workbench.action.terminal.addSelectionToChat', 'Add Selection to Chat'),
	precondition: terminalSelectionWhen,
	keybinding: {
		primary: KeyMod.CtrlCmd | KeyCode.KeyL,
		weight: KeybindingWeight.WorkbenchContrib + 1,
		when: terminalSelectionWhen,
	},
	run: async (activeInstance, _c, accessor) => {
		await addTerminalSelectionToChat(activeInstance, accessor.get(ICommandService), accessor.get(ILogService));
		hideTerminalAddToChat(activeInstance.instanceId);
	}
});
