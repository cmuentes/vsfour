/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Terminal as RawXtermTerminal } from '@xterm/xterm';
import { deepStrictEqual, strictEqual } from 'assert';
import { useFakeTimers } from 'sinon';
import { Emitter } from '../../../../../../base/common/event.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IXtermTerminal } from '../../../../terminal/browser/terminal.js';
import { TerminalAddToChatController, terminalAddToChatSelectionDebounceMs } from '../../browser/terminalAddToChatController.js';
import { IPoint, ISize } from '../../browser/terminalAddToChatGeometry.js';
import { addTerminalSelectionToChat } from '../../browser/terminalAddToChatInvoker.js';
import { ITerminalAddToChatWidget } from '../../browser/terminalAddToChatWidget.js';
import { addTerminalSelectionToChatExtensionCommandId } from '../../common/terminalAddToChat.js';

class FakeAddToChatXterm {
	selection = '';
	viewportY = 0;
	rows = 10;
	position: { start: { x: number; y: number }; end: { x: number; y: number } } | undefined;
	readonly cell = { width: 10, height: 20 };
	readonly canvas = { width: 400, height: 200 };
	readonly selectionEmitter = new Emitter<void>();
	readonly scrollEmitter = new Emitter<number>();
	readonly resizeEmitter = new Emitter<{ cols: number; rows: number }>();
	readonly focusEmitter = new Emitter<boolean>();

	dispose(): void {
		this.selectionEmitter.dispose();
		this.scrollEmitter.dispose();
		this.resizeEmitter.dispose();
		this.focusEmitter.dispose();
	}

	asXterm(): IXtermTerminal & { raw: RawXtermTerminal } {
		const self = this;
		return {
			onDidChangeFocus: this.focusEmitter.event,
			raw: {
				onSelectionChange: this.selectionEmitter.event,
				onScroll: this.scrollEmitter.event,
				onResize: this.resizeEmitter.event,
				hasSelection: () => self.selection.length > 0,
				getSelection: () => self.selection,
				getSelectionPosition: () => self.position,
				get rows() { return self.rows; },
				get dimensions() {
					return { css: { cell: self.cell, canvas: self.canvas } };
				},
				get buffer() {
					return { active: { viewportY: self.viewportY } };
				},
			},
		} as unknown as IXtermTerminal & { raw: RawXtermTerminal };
	}
}

class FakeAddToChatWidget implements ITerminalAddToChatWidget {
	readonly click = new Emitter<void>();
	readonly mouseDown = new Emitter<void>();
	readonly onDidClick = this.click.event;
	readonly onDidMouseDown = this.mouseDown.event;
	visible = false;
	position: IPoint = { top: 0, left: 0 };
	size: ISize = { width: 40, height: 16 };
	showCount = 0;

	setVisible(visible: boolean): void {
		this.visible = visible;
		if (visible) {
			this.showCount++;
		}
	}

	setPosition(position: IPoint): void {
		this.position = position;
	}

	getSize(): ISize {
		return this.size;
	}

	setKeybindingLabel(): void { }

	dispose(): void {
		this.click.dispose();
		this.mouseDown.dispose();
	}
}

suite('TerminalAddToChat controller', () => {
	const store = ensureNoDisposablesAreLeakedInTestSuite();

	function select(xterm: FakeAddToChatXterm, text: string): void {
		xterm.selection = text;
		xterm.position = { start: { x: 0, y: 4 }, end: { x: 8, y: 4 } };
		xterm.selectionEmitter.fire();
	}

	test('shows once after the selection debounce and positions the button', async () => {
		const clock = useFakeTimers();
		try {
			const xterm = new FakeAddToChatXterm();
			const widget = new FakeAddToChatWidget();
			store.add(toDisposable(() => xterm.dispose()));
			store.add(toDisposable(() => widget.dispose()));
			store.add(new TerminalAddToChatController(xterm.asXterm(), widget, () => { }));

			select(xterm, 'echo hi');
			await clock.tickAsync(40);
			select(xterm, 'echo hi');
			strictEqual(widget.visible, false);
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs - 1);
			strictEqual(widget.visible, false);
			await clock.tickAsync(1);
			strictEqual(widget.visible, true);
			strictEqual(widget.showCount, 1);
			deepStrictEqual(widget.position, { top: 60, left: 40 });
		} finally {
			clock.restore();
		}
	});

	test('hides immediately for empty and whitespace-only selections', async () => {
		const clock = useFakeTimers();
		try {
			const xterm = new FakeAddToChatXterm();
			const widget = new FakeAddToChatWidget();
			store.add(toDisposable(() => xterm.dispose()));
			store.add(toDisposable(() => widget.dispose()));
			const controller = store.add(new TerminalAddToChatController(xterm.asXterm(), widget, () => { }));

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			strictEqual(widget.visible, true);

			select(xterm, '   \n');
			strictEqual(widget.visible, false);

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			controller.hide();
			select(xterm, '');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			strictEqual(widget.visible, false);
		} finally {
			clock.restore();
		}
	});

	test('hides on blur and resize, and follows scroll until the selection leaves the viewport', async () => {
		const clock = useFakeTimers();
		try {
			const xterm = new FakeAddToChatXterm();
			const widget = new FakeAddToChatWidget();
			store.add(toDisposable(() => xterm.dispose()));
			store.add(toDisposable(() => widget.dispose()));
			store.add(new TerminalAddToChatController(xterm.asXterm(), widget, () => { }));

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			xterm.viewportY = 2;
			xterm.scrollEmitter.fire(2);
			deepStrictEqual(widget.position, { top: 20, left: 40 });

			xterm.viewportY = 20;
			xterm.scrollEmitter.fire(20);
			strictEqual(widget.visible, false);

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			xterm.resizeEmitter.fire({ cols: 80, rows: 24 });
			strictEqual(widget.visible, false);

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			xterm.focusEmitter.fire(false);
			strictEqual(widget.visible, false);
		} finally {
			clock.restore();
		}
	});

	test('ignores blur that follows a button press', async () => {
		const clock = useFakeTimers();
		try {
			const xterm = new FakeAddToChatXterm();
			const widget = new FakeAddToChatWidget();
			store.add(toDisposable(() => xterm.dispose()));
			store.add(toDisposable(() => widget.dispose()));
			store.add(new TerminalAddToChatController(xterm.asXterm(), widget, () => { }));

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			widget.mouseDown.fire();
			xterm.focusEmitter.fire(false);
			strictEqual(widget.visible, true);
		} finally {
			clock.restore();
		}
	});

	test('invokes the chat command with the selection and then hides', async () => {
		const clock = useFakeTimers();
		try {
			const xterm = new FakeAddToChatXterm();
			const widget = new FakeAddToChatWidget();
			const calls: unknown[][] = [];
			const commandService = {
				executeCommand: async (id: string, ...args: unknown[]) => {
					calls.push([id, ...args]);
				}
			} as unknown as ICommandService;
			store.add(toDisposable(() => xterm.dispose()));
			store.add(toDisposable(() => widget.dispose()));
			store.add(new TerminalAddToChatController(xterm.asXterm(), widget, () => addTerminalSelectionToChat(
				{ selection: 'echo hi', title: 'bash' },
				commandService,
				{ warn() { } } as unknown as ILogService,
			)));

			select(xterm, 'echo hi');
			await clock.tickAsync(terminalAddToChatSelectionDebounceMs);
			widget.click.fire();
			await clock.tickAsync(0);
			deepStrictEqual(calls, [[
				addTerminalSelectionToChatExtensionCommandId,
				{ selection: 'echo hi' },
			]]);
			strictEqual(widget.visible, false);
		} finally {
			clock.restore();
		}
	});
});
