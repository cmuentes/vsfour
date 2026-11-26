/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { createAddTerminalSelectionPayload } from '../../common/terminalAddToChat.js';

suite('TerminalAddToChat payload', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('drops undefined, empty, and whitespace-only selections', () => {
		strictEqual(createAddTerminalSelectionPayload(undefined, 'bash'), undefined);
		strictEqual(createAddTerminalSelectionPayload('', 'bash'), undefined);
		strictEqual(createAddTerminalSelectionPayload(' \n\t ', 'bash'), undefined);
	});

	test('keeps the raw selection and terminal name', () => {
		deepStrictEqual(createAddTerminalSelectionPayload(' echo hi \n', 'bash'), {
			text: ' echo hi \n',
			terminalName: 'bash',
		});
	});

	test('omits terminalName only when it is undefined', () => {
		deepStrictEqual(createAddTerminalSelectionPayload('echo hi', undefined), { text: 'echo hi' });
		deepStrictEqual(createAddTerminalSelectionPayload('echo hi', ''), { text: 'echo hi', terminalName: '' });
	});
});
