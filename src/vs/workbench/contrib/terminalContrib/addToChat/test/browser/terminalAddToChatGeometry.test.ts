/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual, ok, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { clampNumber, computeAddToChatButtonPosition, getSelectionRect } from '../../browser/terminalAddToChatGeometry.js';

suite('TerminalAddToChat geometry', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	const cell = { width: 10, height: 20 };

	test('places the button above the selection and aligns it to the end', () => {
		const selection = getSelectionRect({ x: 2, y: 4 }, { x: 8, y: 4 }, 0, 10, cell);
		ok(selection);
		deepStrictEqual(selection, { top: 80, left: 20, right: 80, bottom: 100 });
		deepStrictEqual(
			computeAddToChatButtonPosition(selection, { width: 400, height: 300 }, { width: 40, height: 16 }, 4),
			{ top: 60, left: 40 },
		);
	});

	test('flips below the selection when the top edge has no room', () => {
		const selection = getSelectionRect({ x: 0, y: 0 }, { x: 4, y: 0 }, 0, 10, cell);
		ok(selection);
		deepStrictEqual(selection, { top: 0, left: 0, right: 40, bottom: 20 });
		deepStrictEqual(
			computeAddToChatButtonPosition(selection, { width: 400, height: 300 }, { width: 40, height: 20 }, 4),
			{ top: 24, left: 0 },
		);
	});

	test('clamps horizontally inside the container', () => {
		const selection = { top: 80, left: 0, right: 190, bottom: 100 };
		const container = { width: 100, height: 200 };
		const button = { width: 40, height: 16 };
		deepStrictEqual(computeAddToChatButtonPosition(selection, container, button, 4), { top: 60, left: 60 });
		deepStrictEqual(computeAddToChatButtonPosition({ ...selection, right: 10 }, container, button, 4), { top: 60, left: 0 });
	});

	test('returns undefined when the selection is fully outside the viewport', () => {
		strictEqual(getSelectionRect({ x: 0, y: 1 }, { x: 3, y: 2 }, 5, 10, cell), undefined);
		strictEqual(getSelectionRect({ x: 0, y: 20 }, { x: 3, y: 22 }, 0, 10, cell), undefined);
	});

	test('clamps a partially visible selection to the viewport', () => {
		deepStrictEqual(
			getSelectionRect({ x: 0, y: 3 }, { x: 4, y: 8 }, 5, 4, cell),
			{ top: 0, left: 0, right: 40, bottom: 80 },
		);
	});

	test('uses the later cell when the selection was dragged upward', () => {
		deepStrictEqual(
			getSelectionRect({ x: 6, y: 4 }, { x: 1, y: 2 }, 0, 10, cell),
			{ top: 40, left: 10, right: 60, bottom: 100 },
		);
	});

	test('clampNumber stays inside the range', () => {
		strictEqual(clampNumber(-4, 0, 10), 0);
		strictEqual(clampNumber(14, 0, 10), 10);
		strictEqual(clampNumber(4, 0, 10), 4);
		strictEqual(clampNumber(3, 5, 1), 5);
	});
});
