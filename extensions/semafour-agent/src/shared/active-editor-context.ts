import { formatCodeContext, isSameCodeContext, type CodeContext } from "./code-context"

export const MAX_SELECTION_CHARS = 8_000

export interface ActiveEditorSelection {
  startLine: number
  endLine: number
  text: string
}

export interface ActiveEditorContext {
  filePath: string
  relativePath: string
  fileName: string
  languageId: string
  selection?: ActiveEditorSelection
}

export interface ActiveEditorContextUpdateMessage {
  type: "activeEditorContextUpdate"
  context: ActiveEditorContext | null
}

export function capSelection(text: string): string {
  if (text.length <= MAX_SELECTION_CHARS) return text
  return text.slice(0, MAX_SELECTION_CHARS)
}

export function activeEditorLabel(editor: ActiveEditorContext): string {
  const sel = editor.selection
  if (!sel) return editor.fileName
  return `${editor.fileName} (${sel.startLine}-${sel.endLine})`
}

export function formatActiveEditor(editor: ActiveEditorContext): string {
  const sel = editor.selection
  if (!sel) return `Active file: ${editor.relativePath}`
  return formatCodeContext({
    id: "",
    filePath: editor.relativePath,
    startLine: sel.startLine,
    endLine: sel.endLine,
    text: capSelection(sel.text),
  })
}

type Range = Pick<CodeContext, "filePath" | "startLine" | "endLine" | "text">

function covered(editor: ActiveEditorContext, contexts: readonly Range[]): boolean {
  const sel = editor.selection
  if (!sel) return false
  const path = editor.relativePath.replaceAll("\\", "/")
  const next = {
    id: "",
    filePath: path,
    startLine: sel.startLine,
    endLine: sel.endLine,
    text: capSelection(sel.text),
  }
  return contexts.some((item) =>
    isSameCodeContext(next, { ...item, id: "", filePath: item.filePath.replaceAll("\\", "/") }),
  )
}

export function withoutActiveEditorBlock(text: string, editor: ActiveEditorContext | undefined): string {
  if (!editor) return text
  const block = formatActiveEditor(editor)
  const suffix = `\n\n${block}`
  if (text.endsWith(suffix)) return text.slice(0, -suffix.length)
  if (text === block) return ""
  return text
}

export function promptWithActiveEditor(
  message: string,
  editor: ActiveEditorContext | undefined,
  contexts: readonly Range[],
): string {
  if (!editor || covered(editor, contexts)) return message
  const block = formatActiveEditor(editor)
  if (!message) return block
  return `${message}\n\n${block}`
}
