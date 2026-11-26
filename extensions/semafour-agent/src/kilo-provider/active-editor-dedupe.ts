import type { EditorContext } from "../services/cli-backend/types"
import type { ActiveEditorContext } from "../shared/active-editor-context"

export function withoutActiveFile(ctx: EditorContext, active?: ActiveEditorContext): EditorContext {
  if (!active || ctx.activeFile === undefined) return ctx
  const next = { ...ctx }
  delete next.activeFile
  return next
}
