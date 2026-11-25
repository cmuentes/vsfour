import { type Component, onMount } from "solid-js"

export const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true

/**
 * Static Semafour mark. Replaces the former yellow Lottie animation; `onReady` reports that the
 * mark can draw so parents keeping a static fallback layer compile without changes.
 */
export const AnimatedKiloLogo: Component<{ playing: boolean; onReady: (ready: boolean) => void }> = (props) => {
  const icons = (window as { ICONS_BASE_URI?: string }).ICONS_BASE_URI || ""
  onMount(() => props.onReady(true))
  return <img class="kilo-logo-lottie" src={`${icons}/semafour-dark.svg`} alt="" aria-hidden="true" />
}
