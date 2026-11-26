import * as path from "node:path"
import * as vscode from "vscode"
import { FileIgnoreController } from "../autocomplete/shims/FileIgnoreController"
import { ActiveEditorContextTracker, type EditorSource, type EditorView } from "./tracker"

function view(editor: vscode.TextEditor): EditorView {
  const uri = editor.document.uri
  const sel = editor.selection
  return {
    key: uri.toString(),
    scheme: uri.scheme,
    fsPath: uri.fsPath,
    name: path.basename(uri.path || uri.fsPath) || "untitled",
    languageId: editor.document.languageId,
    empty: sel.isEmpty,
    startLine: sel.start.line,
    startChar: sel.start.character,
    endLine: sel.end.line,
    endChar: sel.end.character,
    text: sel.isEmpty ? "" : editor.document.getText(sel),
  }
}

function source(): EditorSource {
  return {
    active: () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return undefined
      return view(editor)
    },
    visible: () => vscode.window.visibleTextEditors.map(view),
    onActive: (cb) => vscode.window.onDidChangeActiveTextEditor(() => cb()),
    onSelection: (cb) => vscode.window.onDidChangeTextEditorSelection((event) => cb(view(event.textEditor))),
    onVisible: (cb) => vscode.window.onDidChangeVisibleTextEditors(() => cb()),
  }
}

function relative(editor: EditorView): string {
  if (editor.scheme === "untitled") return editor.key
  return vscode.workspace.asRelativePath(vscode.Uri.file(editor.fsPath), false).replaceAll("\\", "/")
}

async function load(dir: string): Promise<FileIgnoreController> {
  const controller = new FileIgnoreController(dir)
  await controller.initialize()
  return controller
}

async function permit(controllers: Map<string, Promise<FileIgnoreController>>, fsPath: string): Promise<boolean> {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath))
  if (!folder) return true
  const dir = folder.uri.fsPath
  const cached = controllers.get(dir)
  const pending = cached ?? load(dir)
  if (!cached) {
    controllers.set(dir, pending)
    void pending.catch((err: unknown) => {
      if (controllers.get(dir) === pending) controllers.delete(dir)
      console.warn("[Semafour New] active editor ignore load failed", err)
    })
  }
  const controller = await pending
  return controller.validateAccess(fsPath)
}

export function createActiveEditorTracker(): ActiveEditorContextTracker {
  const controllers = new Map<string, Promise<FileIgnoreController>>()
  return new ActiveEditorContextTracker({
    source: source(),
    relative,
    permit: (fsPath) => permit(controllers, fsPath),
    onDispose: () => {
      for (const pending of controllers.values()) {
        void pending.then(
          (controller) => controller.dispose(),
          (err: unknown) => console.warn("[Semafour New] active editor ignore dispose failed", err),
        )
      }
      controllers.clear()
    },
  })
}
