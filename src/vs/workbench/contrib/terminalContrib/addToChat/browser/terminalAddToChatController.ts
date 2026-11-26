/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Terminal as RawXtermTerminal } from '@xterm/xterm';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IXtermTerminal } from '../../../terminal/browser/terminal.js';
import { computeAddToChatButtonPosition, getSelectionRect, terminalAddToChatButtonGap } from './terminalAddToChatGeometry.js';
import { ITerminalAddToChatWidget } from './terminalAddToChatWidget.js';

export const terminalAddToChatSelectionDebounceMs = 75;

const fallbackButtonSize = { width: 120, height: 24 };

export class TerminalAddToChatController extends Disposable {
	private _visible = false;
	private _ignoreBlur = false;

	constructor(
		private readonly _xterm: IXtermTerminal & { raw: RawXtermTerminal },
		private readonly _widget: ITerminalAddToChatWidget,
		private readonly _trigger: () => void | Promise<void>,
	) {
		super();

		const debouncedSelection = Event.debounce(this._xterm.raw.onSelectionChange, () => undefined as void, terminalAddToChatSelectionDebounceMs, false, false, undefined, this._store);
		this._register(this._xterm.raw.onSelectionChange(() => {
			if (!this._hasUsableSelection()) {
				this.hide();
			}
		}));
		this._register(debouncedSelection(() => {
			if (this._hasUsableSelection()) {
				this.refresh();
			}
		}));
		this._register(this._xterm.raw.onScroll(() => {
			if (this._visible) {
				this.refresh();
			}
		}));
		this._register(this._xterm.raw.onResize(() => this.hide()));
		this._register(this._xterm.onDidChangeFocus(focused => {
			if (!focused && !this._ignoreBlur) {
				this.hide();
			}
		}));
		this._register(this._widget.onDidMouseDown(() => {
			this._ignoreBlur = true;
		}));
		this._register(this._widget.onDidClick(() => {
			this._ignoreBlur = false;
			Promise.resolve(this._trigger()).finally(() => this.hide());
		}));
	}

	refresh(): void {
		if (this._store.isDisposed || !this._hasUsableSelection()) {
			this.hide();
			return;
		}

		const position = this._xterm.raw.getSelectionPosition();
		const cell = this._xterm.raw.dimensions?.css.cell;
		const canvas = this._xterm.raw.dimensions?.css.canvas;
		if (!position || !cell || !canvas || cell.width <= 0 || cell.height <= 0) {
			this.hide();
			return;
		}

		const rect = getSelectionRect(position.start, position.end, this._xterm.raw.buffer.active.viewportY, this._xterm.raw.rows, cell);
		if (!rect) {
			this.hide();
			return;
		}

		const measured = this._widget.getSize();
		const buttonSize = measured.width > 0 && measured.height > 0 ? measured : fallbackButtonSize;
		this._widget.setPosition(computeAddToChatButtonPosition(rect, canvas, buttonSize, terminalAddToChatButtonGap));
		this._visible = true;
		this._widget.setVisible(true);
	}

	hide(): void {
		if (this._store.isDisposed) {
			return;
		}
		this._visible = false;
		this._ignoreBlur = false;
		this._widget.setVisible(false);
	}

	private _hasUsableSelection(): boolean {
		return this._xterm.raw.hasSelection() && this._xterm.raw.getSelection().trim().length > 0;
	}
}
