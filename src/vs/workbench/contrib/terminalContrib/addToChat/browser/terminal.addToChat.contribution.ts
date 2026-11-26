/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Terminal as RawXtermTerminal } from '@xterm/xterm';
import { Disposable, type IDisposable } from '../../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITerminalContribution, ITerminalInstance, IXtermTerminal } from '../../../terminal/browser/terminal.js';
import { registerTerminalContribution, type ITerminalContributionContext } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalAddToChatCommandId } from '../common/terminalAddToChat.js';
import { TerminalAddToChatController } from './terminalAddToChatController.js';
import { addTerminalSelectionToChat, setTerminalAddToChatHideHandler } from './terminalAddToChatInvoker.js';
import { TerminalAddToChatWidget } from './terminalAddToChatWidget.js';
import './terminalAddToChatActions.js';

export class TerminalAddToChatContribution extends Disposable implements ITerminalContribution {
	static readonly ID = 'terminal.addToChat';

	static get(instance: ITerminalInstance): TerminalAddToChatContribution | null {
		return instance.getContribution<TerminalAddToChatContribution>(TerminalAddToChatContribution.ID);
	}

	private _controller: TerminalAddToChatController | undefined;
	private _widget: TerminalAddToChatWidget | undefined;
	private _widgetAttachment: IDisposable | undefined;

	constructor(
		private readonly _ctx: ITerminalContributionContext,
		@ICommandService private readonly _commandService: ICommandService,
		@IKeybindingService private readonly _keybindingService: IKeybindingService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
	}

	xtermReady(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		const widget = this._register(new TerminalAddToChatWidget(this._keybindingLabel()));
		this._widget = widget;
		this._register(this._keybindingService.onDidUpdateKeybindings(() => {
			widget.setKeybindingLabel(this._keybindingLabel());
		}));
		this._controller = this._register(new TerminalAddToChatController(
			xterm,
			widget,
			() => addTerminalSelectionToChat(this._ctx.instance, this._commandService, this._logService),
		));
		this._register(setTerminalAddToChatHideHandler(this._ctx.instance.instanceId, () => this.hide()));
		if (this._tryAttachWidget()) {
			this._controller.refresh();
		}
	}

	xtermOpen(): void {
		if (!this._tryAttachWidget()) {
			queueMicrotask(() => {
				if (this._store.isDisposed) {
					return;
				}
				if (this._tryAttachWidget()) {
					this._controller?.refresh();
				}
			});
			return;
		}
		this._controller?.refresh();
	}

	hide(): void {
		this._controller?.hide();
	}

	private _tryAttachWidget(): boolean {
		if (this._widgetAttachment || !this._widget) {
			return !!this._widgetAttachment;
		}
		const attachment = this._ctx.widgetManager.attachWidget(this._widget);
		if (!attachment) {
			return false;
		}
		this._widgetAttachment = this._register(attachment);
		return true;
	}

	private _keybindingLabel(): string | undefined {
		return this._keybindingService.lookupKeybinding(TerminalAddToChatCommandId.AddSelectionToChat)?.getLabel() ?? undefined;
	}
}

registerTerminalContribution(TerminalAddToChatContribution.ID, TerminalAddToChatContribution);
