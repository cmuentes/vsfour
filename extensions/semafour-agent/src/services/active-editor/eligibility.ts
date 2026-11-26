const SCHEMES = new Set(["file", "untitled"])

export function trackable(scheme: string): boolean {
  return SCHEMES.has(scheme)
}
