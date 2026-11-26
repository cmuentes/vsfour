import type { ActiveEditorContext } from "../../shared/active-editor-context"
import { trackable } from "./eligibility"
import { resolveEditor } from "./resolve"
import { snapshotEditor, type EditorView } from "./snapshot"

export const SELECTION_WAIT = 120

export type { EditorView }

export interface EditorSource {
  active(): EditorView | undefined
  visible(): readonly EditorView[]
  onActive(cb: () => void): { dispose(): void }
  onSelection(cb: (editor: EditorView) => void): { dispose(): void }
  onVisible(cb: () => void): { dispose(): void }
}

type Cancel = () => void

export interface TrackerOptions {
  source: EditorSource
  relative(editor: EditorView): string
  permit(fsPath: string): Promise<boolean>
  delay?: (wait: number, run: () => void) => Cancel
  onDispose?: () => void
}

function delay(wait: number, run: () => void): Cancel {
  const id = setTimeout(run, wait)
  return () => clearTimeout(id)
}

export class ActiveEditorContextTracker {
  private readonly source: EditorSource
  private readonly relative: (editor: EditorView) => string
  private readonly permit: (fsPath: string) => Promise<boolean>
  private readonly delay: (wait: number, run: () => void) => Cancel
  private readonly onDispose: (() => void) | undefined
  private readonly listeners = new Set<(context: ActiveEditorContext | null) => void>()
  private readonly subs: Array<{ dispose(): void }>
  private cached: EditorView | undefined
  private value: ActiveEditorContext | null = null
  private serialized = JSON.stringify(null)
  private token = 0
  private stop: Cancel | undefined
  private disposed = false

  constructor(opts: TrackerOptions) {
    this.source = opts.source
    this.relative = opts.relative
    this.permit = opts.permit
    this.delay = opts.delay ?? delay
    this.onDispose = opts.onDispose
    this.subs = [
      opts.source.onActive(() => this.refresh()),
      opts.source.onVisible(() => this.refresh()),
      opts.source.onSelection((editor) => this.onSelection(editor)),
    ]
    void this.sync()
  }

  current(): ActiveEditorContext | null {
    return this.value
  }

  subscribe(listener: (context: ActiveEditorContext | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.token += 1
    this.cancel()
    for (const sub of this.subs) sub.dispose()
    this.subs.length = 0
    this.listeners.clear()
    this.onDispose?.()
  }

  private refresh(): void {
    if (this.disposed) return
    this.cancel()
    void this.sync()
  }

  private onSelection(editor: EditorView): void {
    if (this.disposed || !trackable(editor.scheme)) return
    if (this.cached && editor.key !== this.cached.key) return
    this.cancel()
    this.stop = this.delay(SELECTION_WAIT, () => {
      this.stop = undefined
      void this.sync()
    })
  }

  private cancel(): void {
    this.stop?.()
    this.stop = undefined
  }

  private async sync(): Promise<void> {
    if (this.disposed) return
    const token = ++this.token
    const editor = resolveEditor(this.source.active(), this.source.visible(), this.cached)
    this.cached = editor
    if (!editor) {
      this.publish(null, token)
      return
    }
    const allowed =
      editor.scheme === "file"
        ? await this.permit(editor.fsPath).catch((err: unknown) => {
            console.warn("[Semafour New] active editor ignore check failed", err)
            return true
          })
        : true
    if (this.disposed || token !== this.token) return
    if (!allowed) {
      this.publish(null, token)
      return
    }
    this.publish(snapshotEditor(editor, this.relative(editor)), token)
  }

  private publish(next: ActiveEditorContext | null, token: number): void {
    if (this.disposed || token !== this.token) return
    const key = JSON.stringify(next)
    if (key === this.serialized) return
    this.serialized = key
    this.value = next
    for (const listener of this.listeners) listener(next)
  }
}
