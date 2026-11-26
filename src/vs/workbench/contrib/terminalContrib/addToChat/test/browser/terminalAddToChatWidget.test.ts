/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual } from 'assert';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalAddToChatWidget } from '../../browser/terminalAddToChatWidget.js';

suite('TerminalAddToChat widget', () => {
	const store = ensureNoDisposablesAreLeakedInTestSuite();

	test('mousedown is cancelled before it can clear the terminal selection', () => {
		const widget = store.add(new TerminalAddToChatWidget('⌘L'));
		const container = document.createElement('div');
		document.body.appendChild(container);
		store.add(toDisposable(() => container.remove()));
		widget.attach(container);

		const button = container.querySelector('button');
		strictEqual(button?.textContent, 'Add to Chat⌘L');
		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		button?.dispatchEvent(event);
		strictEqual(event.defaultPrevented, true);
	});
});
