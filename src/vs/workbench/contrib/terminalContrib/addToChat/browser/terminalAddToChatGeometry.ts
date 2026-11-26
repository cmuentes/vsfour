/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ITerminalRect {
	readonly top: number;
	readonly left: number;
	readonly right: number;
	readonly bottom: number;
}

export interface ISize {
	readonly width: number;
	readonly height: number;
}

export interface IPoint {
	readonly top: number;
	readonly left: number;
}

export interface ICellPosition {
	readonly x: number;
	readonly y: number;
}

export const terminalAddToChatButtonGap = 4;

export function clampNumber(value: number, min: number, max: number): number {
	if (max < min) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}

export function getSelectionRect(start: ICellPosition, end: ICellPosition, viewportY: number, viewportRowCount: number, cell: ISize): ITerminalRect | undefined {
	const startLine = Math.min(start.y, end.y);
	const endLine = Math.max(start.y, end.y);
	const viewportEnd = viewportY + viewportRowCount;
	if (endLine < viewportY || startLine >= viewportEnd) {
		return undefined;
	}

	const visibleStart = Math.max(startLine, viewportY);
	const visibleEnd = Math.min(endLine, viewportEnd - 1);
	const earlier = isAtOrBefore(start, end) ? start : end;
	const later = earlier === start ? end : start;
	return {
		top: (visibleStart - viewportY) * cell.height,
		bottom: (visibleEnd - viewportY + 1) * cell.height,
		left: earlier.x * cell.width,
		right: later.x * cell.width,
	};
}

export function computeAddToChatButtonPosition(selection: ITerminalRect, container: ISize, button: ISize, gap: number): IPoint {
	const above = selection.top - gap - button.height;
	const top = clampNumber(above >= 0 ? above : selection.bottom + gap, 0, Math.max(0, container.height - button.height));
	const left = clampNumber(selection.right - button.width, 0, Math.max(0, container.width - button.width));
	return { top, left };
}

function isAtOrBefore(a: ICellPosition, b: ICellPosition): boolean {
	return a.y < b.y || (a.y === b.y && a.x <= b.x);
}
