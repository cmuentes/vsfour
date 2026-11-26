import { capSelection, type ActiveEditorContext } from "../../shared/active-editor-context"

export interface EditorView {
  key: string
  scheme: string
  fsPath: string
  name: string
  languageId: string
  empty: boolean
  startLine: number
  startChar: number
  endLine: number
  endChar: number
  text: string
}

export function snapshotEditor(editor: EditorView, relativePath: string): ActiveEditorContext {
  const filePath = editor.scheme === "untitled" ? editor.key : editor.fsPath
  const base = {
    filePath,
    relativePath,
    fileName: editor.name || relativePath,
    languageId: editor.languageId,
  }
  if (editor.empty) return base
  const startLine = editor.startLine + 1
  const rawEnd = editor.endChar === 0 && editor.endLine > editor.startLine ? editor.endLine : editor.endLine + 1
  const endLine = Math.max(startLine, rawEnd)
  return {
    ...base,
    selection: {
      startLine,
      endLine,
      text: capSelection(editor.text),
    },
  }
}
