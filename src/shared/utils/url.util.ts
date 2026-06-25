export function normalizeOrigin(url?: string): string {
  return url?.replace(/\/+$/, '') ?? '';
}
