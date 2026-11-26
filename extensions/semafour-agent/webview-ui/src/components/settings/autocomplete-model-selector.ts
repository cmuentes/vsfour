import { AUTOCOMPLETE_MODELS, getAutocompleteModel } from "../../../../src/shared/autocomplete-models"
import type { EnrichedModel } from "../../context/provider"
import { isSmall } from "../shared/model-selector-utils"

/**
 * Resolve the (provider, model) pair to the dropdown's value. Returns
 * `null` when neither is set so the selector renders the "Not set" (clear)
 * state via `allowClear`. The runtime resolves unset values to
 * `DEFAULT_AUTOCOMPLETE_MODEL` separately.
 */
export function getAutocompleteSelection(provider?: string, modelID?: string) {
  if (!provider || !modelID || provider === "kilo") return null
  const model = getAutocompleteModel(provider, modelID)
  if (model.providerID === provider && model.modelID === modelID) {
    return { providerID: model.providerID, modelID: model.modelID }
  }
  return { providerID: provider, modelID }
}

export const AUTOCOMPLETE_SELECTOR_MODELS: EnrichedModel[] = AUTOCOMPLETE_MODELS.map((m) => ({
  id: m.modelID,
  name: m.label,
  providerID: m.providerID,
  providerName: m.provider,
}))

export function autocompleteSelectorModels(models: readonly EnrichedModel[], connected: readonly string[]) {
  const live = new Set(connected)
  const presets = AUTOCOMPLETE_SELECTOR_MODELS.filter((item) => item.providerID !== "kilo" && live.has(item.providerID))
  const seen = new Set(presets.map((item) => `${item.providerID}/${item.id}`))
  const rest = models.filter((item) => {
    if (item.providerID === "kilo" || !live.has(item.providerID) || isSmall(item)) return false
    return !seen.has(`${item.providerID}/${item.id}`)
  })
  return [...presets, ...rest]
}
