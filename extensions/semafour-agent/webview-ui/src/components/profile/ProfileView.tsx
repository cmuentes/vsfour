import { Component, createSignal, onMount, Show } from "solid-js"
import { useVSCode } from "../../context/vscode"
import { useLanguage } from "../../context/language"
import type { ProviderUsageData } from "../../types/messages"
import { ProviderUsageCards } from "./ProviderUsageCards"
import SessionList from "../history/SessionList"
import { Button } from "@kilocode/kilo-ui/button"

export interface ProfileViewProps {
  providerUsage?: ProviderUsageData
  providerUsageLoading?: boolean
  providerUsageError?: string
  onRequestProviderUsage?: () => void
  onRefreshProviderUsage?: () => void
  localUsage?: number
  localUsageLoading?: boolean
  localUsageError?: string
  onRequestLocalUsage?: () => void
  onSelectSession?: (id: string) => void
}

const ProfileView: Component<ProfileViewProps> = (props) => {
  const vscode = useVSCode()
  const language = useLanguage()
  const [showHistory, setShowHistory] = createSignal(false)

  onMount(() => {
    // #region agent log
    fetch("http://127.0.0.1:7448/ingest/6ebf811e-dd9f-4455-b1f4-a3a97f8cc1fa", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bfbe94" },
      body: JSON.stringify({
        sessionId: "bfbe94",
        runId: "post-fix",
        hypothesisId: "A",
        location: "ProfileView.tsx:onMount",
        message: "Profile surface mounted",
        data: {
          requestsLocalUsage: typeof props.onRequestLocalUsage === "function",
          hasLocalUsage: props.localUsage !== undefined,
          loading: props.localUsageLoading === true,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    props.onRequestProviderUsage?.()
    props.onRequestLocalUsage?.()
  })

  const openExternal = (url: string) => {
    vscode.postMessage({ type: "openExternal", url })
  }

  const formatTokens = (tokens: number) => new Intl.NumberFormat(language.locale()).format(tokens)

  return (
    <div style={{ display: "flex", "flex-direction": "column", height: "100%", "min-height": 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 16px",
          "border-bottom": "1px solid var(--border-weak-base)",
          display: "flex",
          "align-items": "center",
          gap: "8px",
        }}
      >
        <h2 style={{ "font-size": "var(--kilo-font-size-16)", "font-weight": "600", margin: 0 }}>
          {language.t("profile.title")}
        </h2>
      </div>
      <Show
        when={showHistory()}
        fallback={
          <div
            data-profile-scroll
            style={{
              flex: 1,
              "min-height": 0,
              "overflow-y": "auto",
              "overflow-x": "hidden",
              padding: "16px",
              "max-width": "480px",
              margin: "0 auto",
              width: "100%",
              "box-sizing": "border-box",
            }}
          >
            <div style={{ "margin-bottom": "16px" }}>
              <div
                style={{
                  "font-size": "var(--kilo-font-size-13)",
                  "font-weight": "600",
                  color: "var(--text-base)",
                  "margin-bottom": "4px",
                }}
              >
                {language.t("profile.localUsage.title")}
              </div>
              <div
                style={{
                  "font-size": "var(--kilo-font-size-12)",
                  color: "var(--text-weak, var(--vscode-descriptionForeground))",
                  "margin-bottom": "8px",
                }}
              >
                {language.t("profile.localUsage.description")}
              </div>
              <Show
                when={props.localUsage === undefined && props.localUsageLoading}
                fallback={
                  <Show
                    when={props.localUsage !== undefined}
                    fallback={
                      <div style={{ "font-size": "var(--kilo-font-size-12)", color: "var(--text-weak)" }}>
                        {props.localUsageError ?? language.t("profile.localUsage.empty")}
                      </div>
                    }
                  >
                    <div style={{ display: "flex", "align-items": "baseline", gap: "6px" }}>
                      <span
                        style={{ "font-size": "var(--kilo-font-size-24)", "font-weight": "700", color: "var(--text-base)" }}
                      >
                        {formatTokens(props.localUsage!)}
                      </span>
                      <span style={{ "font-size": "var(--kilo-font-size-12)", color: "var(--text-weak)" }}>
                        {language.t("profile.localUsage.tokens")}
                      </span>
                    </div>
                  </Show>
                }
              >
                <div style={{ "font-size": "var(--kilo-font-size-12)", color: "var(--text-weak)" }}>
                  {language.t("profile.localUsage.loading")}
                </div>
              </Show>
              <Show when={props.onSelectSession}>
                <div style={{ "margin-top": "12px" }}>
                  <Button variant="secondary" size="small" icon="history" onClick={() => setShowHistory(true)}>
                    {language.t("profile.history.show")}
                  </Button>
                </div>
              </Show>
            </div>
            <ProviderUsageCards
              data={props.providerUsage}
              loading={props.providerUsageLoading ?? !props.providerUsage}
              error={props.providerUsageError}
              onRefresh={() => props.onRefreshProviderUsage?.()}
              onOpen={openExternal}
            />
          </div>
        }
      >
        <div style={{ flex: 1, "min-height": 0, display: "flex", "flex-direction": "column" }}>
          <div
            style={{
              "flex-shrink": 0,
              padding: "8px 12px",
              display: "flex",
              "align-items": "center",
              "justify-content": "space-between",
              "border-bottom": "1px solid var(--border-weak-base)",
            }}
          >
            <span style={{ "font-size": "var(--kilo-font-size-13)", "font-weight": "600", color: "var(--text-base)" }}>
              {language.t("profile.history.title")}
            </span>
            <Button variant="ghost" size="small" icon="chevron-left" onClick={() => setShowHistory(false)}>
              {language.t("profile.history.hide")}
            </Button>
          </div>
          <div style={{ flex: 1, "min-height": 0, padding: "8px" }}>
            <SessionList onSelectSession={props.onSelectSession!} />
          </div>
        </div>
      </Show>
    </div>
  )
}

export default ProfileView
