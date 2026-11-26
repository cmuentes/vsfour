import { trackable } from "./eligibility"

export function resolveEditor<T extends { key: string; scheme: string }>(
  active: T | undefined,
  visible: readonly T[],
  cached: T | undefined,
): T | undefined {
  if (active && trackable(active.scheme)) return active
  const fresh = cached ? visible.find((item) => item.key === cached.key && trackable(item.scheme)) : undefined
  if (fresh) return fresh
  return visible.find((item) => trackable(item.scheme))
}
