import type { Component } from "solid-js"
import { FileIcon } from "@kilocode/kilo-ui/file-icon"
import { Icon } from "@kilocode/kilo-ui/icon"
import { activeEditorLabel, type ActiveEditorContext } from "../../../../src/shared/active-editor-context"
import { useVSCode } from "../../context/vscode"

interface ActiveEditorPillProps {
  editor: ActiveEditorContext
  sessionID?: string
}

export const ActiveEditorPill: Component<ActiveEditorPillProps> = (props) => {
  const vscode = useVSCode()
  const label = () => activeEditorLabel(props.editor)
  const reveal = () => {
    const line = props.editor.selection?.startLine
    const event = new CustomEvent("kilo:open-file", {
      cancelable: true,
      detail: { filePath: props.editor.filePath, line, column: 1, sessionID: props.sessionID },
    })
    if (!window.dispatchEvent(event)) return
    vscode.postMessage({
      type: "openFile",
      filePath: props.editor.filePath,
      line,
      column: 1,
      sessionID: props.sessionID,
    })
  }

  return (
    <div class="active-editor-pill" data-component="active-editor">
      <button type="button" class="active-editor-pill-button" title={label()} onClick={reveal}>
        <span class="prompt-review-row-icon">
          <FileIcon node={{ path: props.editor.fileName, type: "file" }} />
        </span>
        <span class="prompt-review-row-label">{label()}</span>
        <Icon name="go-to-file" size="small" />
      </button>
    </div>
  )
}
