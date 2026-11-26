import { createContext, createSignal, onCleanup, useContext } from "solid-js"
import type { Accessor, ParentComponent } from "solid-js"
import type { ActiveEditorContext } from "../../../src/shared/active-editor-context"
import { useVSCode } from "./vscode"

interface ActiveEditorContextValue {
  current: Accessor<ActiveEditorContext | undefined>
}

const ActiveEditorState = createContext<ActiveEditorContextValue>()

const empty: ActiveEditorContextValue = { current: () => undefined }

export const ActiveEditorProvider: ParentComponent<{ value?: ActiveEditorContext }> = (props) => {
  const vscode = useVSCode()
  const [editor, setEditor] = createSignal<ActiveEditorContext | undefined>(props.value)

  const unsubscribe = vscode.onMessage((message) => {
    if (message.type !== "activeEditorContextUpdate") return
    const context = "context" in message ? message.context : undefined
    setEditor(context ?? undefined)
  })

  onCleanup(unsubscribe)

  return <ActiveEditorState.Provider value={{ current: editor }}>{props.children}</ActiveEditorState.Provider>
}

export function useActiveEditor(): ActiveEditorContextValue {
  return useContext(ActiveEditorState) ?? empty
}
