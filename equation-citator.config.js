/**
 * Path mappings for cross-file citation URL resolution.
 *
 * When the browser's current URL pathname matches a `urlPattern`,
 * relative file paths from `data-ec-refs` are resolved against `baseUrl`.
 *
 * Entries are tried in order — the first match wins.
 * If no pattern matches, falls back to the current page's directory.
 *
 * To add a new section, add an entry like:
 *   { urlPattern: '/posts/', baseUrl: '/posts' }
 */
export const pathMappings = [
  { urlPattern: '/knowledge-base/', baseUrl: '/knowledge-base' },
]
