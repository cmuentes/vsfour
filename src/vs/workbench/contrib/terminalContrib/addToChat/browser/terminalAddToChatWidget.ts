/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, addDisposableListener } from '../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ITerminalWidget } from '../../../terminal/browser/widgets/widgets.js';
import { IPoint, ISize } from './terminalAddToChatGeometry.js';
import './media/terminalAddToChat.css';

export interface ITerminalAddToChatWidget {
	readonly onDidClick: Event<void>;
	readonly onDidMouseDown: Event<void>;
	setVisible(visible: boolean): void;
	setPosition(position: IPoint): void;
	getSize(): ISize;
	setKeybindingLabel(label: string | undefined): void;
}

export class TerminalAddToChatWidget extends Disposable implements ITerminalWidget, ITerminalAddToChatWidget {
	readonly id = 'terminal.addToChat';

	private readonly _onDidClick = this._register(new Emitter<void>());
	readonly onDidClick = this._onDidClick.event;

	private readonly _onDidMouseDown = this._register(new Emitter<void>());
	readonly onDidMouseDown = this._onDidMouseDown.event;

	private _element: HTMLButtonElement | undefined;
	private _keybindingElement: HTMLElement | undefined;
	private _visible = false;
	private _position: IPoint = { top: 0, left: 0 };
	private _keybindingLabel: string | undefined;

	constructor(keybindingLabel: string | undefined) {
		super();
		this._keybindingLabel = keybindingLabel;
	}

	attach(container: HTMLElement): void {
		const label = $('.terminal-add-to-chat-label', undefined, localize('terminal.addToChat.label', "Add to Chat"));
		this._keybindingElement = $('.terminal-add-to-chat-keybinding');
		this._element = $('button.terminal-add-to-chat', { type: 'button', tabindex: '-1' }, label, this._keybindingElement);
		this._applyKeybindingLabel();
		this._register(addDisposableListener(this._element, 'mousedown', event => {
			event.preventDefault();
			event.stopPropagation();
			this._onDidMouseDown.fire();
		}));
		this._register(addDisposableListener(this._element, 'pointerdown', event => {
			event.preventDefault();
			event.stopPropagation();
		}));
		this._register(addDisposableListener(this._element, 'mouseup', event => {
			event.preventDefault();
			event.stopPropagation();
		}));
		this._register(addDisposableListener(this._element, 'click', event => {
			event.preventDefault();
			event.stopPropagation();
			this._onDidClick.fire();
		}));
		container.appendChild(this._element);
		this._register(toDisposable(() => this._element?.remove()));
		this._apply();
	}

	setVisible(visible: boolean): void {
		this._visible = visible;
		this._apply();
	}

	setPosition(position: IPoint): void {
		this._position = position;
		this._apply();
	}

	getSize(): ISize {
		if (!this._element) {
			return { width: 0, height: 0 };
		}
		return { width: this._element.offsetWidth, height: this._element.offsetHeight };
	}

	setKeybindingLabel(label: string | undefined): void {
		this._keybindingLabel = label;
		this._applyKeybindingLabel();
	}

	private _apply(): void {
		if (!this._element) {
			return;
		}
		this._element.style.top = `${this._position.top}px`;
		this._element.style.left = `${this._position.left}px`;
		this._element.classList.toggle('visible', this._visible);
	}

	private _applyKeybindingLabel(): void {
		if (!this._keybindingElement) {
			return;
		}
		this._keybindingElement.textContent = this._keybindingLabel ?? '';
		this._keybindingElement.classList.toggle('empty', !this._keybindingLabel);
	}
}
