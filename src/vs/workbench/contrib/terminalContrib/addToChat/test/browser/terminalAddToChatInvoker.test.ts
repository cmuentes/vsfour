/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { addTerminalSelectionToChat, hideTerminalAddToChat, setTerminalAddToChatHideHandler } from '../../browser/terminalAddToChatInvoker.js';
import { addTerminalSelectionToChatExtensionCommandId } from '../../common/terminalAddToChat.js';

suite('TerminalAddToChat invoker', () => {
	const store = ensureNoDisposablesAreLeakedInTestSuite();

	function commandService(reject = false): { service: ICommandService; calls: unknown[][] } {
		const calls: unknown[][] = [];
		const service = {
			executeCommand: async (id: string, ...args: unknown[]) => {
				calls.push([id, ...args]);
				if (reject) {
					throw new Error('command missing');
				}
				return undefined;
			}
		} as unknown as ICommandService;
		return { service, calls };
	}

	test('executes the terminal context command with the selection', async () => {
		const { service, calls } = commandService();
		await addTerminalSelectionToChat({ selection: 'echo hi', title: 'bash' }, service, { warn() { } } as unknown as ILogService);
		deepStrictEqual(calls, [[
			addTerminalSelectionToChatExtensionCommandId,
			{ selection: 'echo hi' },
		]]);
	});

	test('does nothing for a whitespace-only selection', async () => {
		const { service, calls } = commandService();
		await addTerminalSelectionToChat({ selection: ' \t', title: 'bash' }, service, { warn() { } } as unknown as ILogService);
		strictEqual(calls.length, 0);
	});

	test('logs and swallows a rejected command', async () => {
		const { service } = commandService(true);
		const warnings: unknown[][] = [];
		const logService = { warn: (...args: unknown[]) => warnings.push(args) } as unknown as ILogService;
		await addTerminalSelectionToChat({ selection: 'echo hi', title: 'bash' }, service, logService);
		strictEqual(warnings.length, 1);
	});

	test('hide handler is removed on dispose', () => {
		let hidden = 0;
		const hide = store.add(setTerminalAddToChatHideHandler(7, () => hidden++));
		hideTerminalAddToChat(7);
		strictEqual(hidden, 1);
		hide.dispose();
		hideTerminalAddToChat(7);
		strictEqual(hidden, 1);
	});
});
