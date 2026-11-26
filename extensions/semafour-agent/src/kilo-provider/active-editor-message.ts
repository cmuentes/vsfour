import { z } from "zod"
import type { ActiveEditorContext } from "../shared/active-editor-context"

const selection = z.object({
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  text: z.string(),
})

const editor = z.object({
  filePath: z.string().min(1),
  relativePath: z.string().min(1),
  fileName: z.string().min(1),
  languageId: z.string(),
  selection: selection.optional(),
})

export function parseActiveEditor(value: unknown): ActiveEditorContext | undefined {
  return editor.optional().catch(undefined).parse(value)
}
