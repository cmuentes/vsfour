import type { ActiveEditorContext } from "../shared/active-editor-context"
import type { ActiveEditorContextTracker } from "../services/active-editor/tracker"

type Post = (msg: unknown) => void

export function watchActiveEditorContext(tracker: ActiveEditorContextTracker, post: Post): { dispose(): void } {
  const send = (context: ActiveEditorContext | null) => post({ type: "activeEditorContextUpdate", context })
  const stop = tracker.subscribe(send)
  return { dispose: stop }
}
