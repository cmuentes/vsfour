import { ResponseMetaData } from "./types"
import type { KiloConnectionService } from "../cli-backend"
import {
  getAutocompleteModel,
  getAutocompleteModelById,
  type AutocompleteModelDef,
} from "../../shared/autocomplete-models"

export function resolveAutocomplete(provider?: string, model?: string): AutocompleteModelDef {
  const pid = provider?.trim()
  const mid = model?.trim()
  const info = getAutocompleteModel(pid, mid)
  if (pid && mid && pid !== "kilo" && (info.providerID !== pid || info.modelID !== mid)) {
    return {
      id: `${pid}/${mid}`,
      modelID: mid,
      label: mid,
      providerID: pid,
      provider: pid,
      requestModel: mid,
      temperature: 0.2,
    } as AutocompleteModelDef
  }
  return info
}

export function modelById(id: string): AutocompleteModelDef {
  const info = getAutocompleteModelById(id)
  if (info.id === id) return info
  const slash = id.indexOf("/")
  if (slash <= 0) return info
  const providerID = id.slice(0, slash)
  const modelID = id.slice(slash + 1)
  if (!providerID || !modelID || providerID === "kilo") return info
  return {
    id,
    modelID,
    label: modelID,
    providerID,
    provider: providerID,
    requestModel: modelID,
    temperature: 0.2,
  } as AutocompleteModelDef
}

const FIM_MAX_TOKENS = 256

export function fimModel(provider?: string, model?: string) {
  const info = resolveAutocomplete(provider, model)
  if (info.kind !== "edit") return info
  return getAutocompleteModelById(info.fimModelID)
}

/**
 * Generate a FIM (Fill-in-the-Middle) completion via the CLI backend.
 * Uses the SDK's kilo.fim() SSE endpoint which handles auth and streaming.
 *
 * @param signal - Optional AbortSignal to cancel the SSE stream early (e.g. when the user types again)
 */
export async function generateFim(
  connectionService: KiloConnectionService,
  modelId: string,
  prefix: string,
  suffix: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<ResponseMetaData> {
  const client = await connectionService.getClientAsync()
  const info = modelById(modelId)
  let cost = 0
  let inputTokens = 0
  let outputTokens = 0

  // Capture SSE-level errors so they propagate to the caller. The SDK's SSE
  // client catches HTTP errors (402, 401, 429, 5xx) internally and silently
  // ends the stream. Without this, errors never reach ErrorBackoff.
  let sseError: Error | undefined

  console.info(`[FIM] request provider=${info.providerID} model=${info.requestModel} url=/kilo/fim`)

  const { stream } = await client.kilo.fim(
    {
      prefix,
      suffix,
      provider: info.providerID,
      model: info.modelID,
      maxTokens: FIM_MAX_TOKENS,
      temperature: info.temperature,
    },
    {
      signal,
      sseMaxRetryAttempts: 1,
      onSseError: (error) => {
        sseError = error instanceof Error ? error : new Error(String(error))
      },
    },
  )

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0]
    const content = choice?.delta?.content ?? choice?.text
    if (content) onChunk(content)
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
    if (chunk.cost !== undefined) cost = chunk.cost
  }

  if (sseError) throw sseError

  return {
    cost,
    inputTokens,
    outputTokens,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
  }
}

/**
 * Check if the CLI backend is connected. The CLI manages credentials internally,
 * so a connected state means we can issue FIM requests.
 */
export function hasValidCredentials(connectionService: KiloConnectionService): boolean {
  return connectionService.getConnectionState() === "connected"
}
