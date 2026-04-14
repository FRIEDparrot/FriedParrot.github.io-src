export function convertObsidianLinksInText(content) {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, rawTarget, rawAlias) => {
    const target = rawTarget.trim()
    const alias = (rawAlias || rawTarget).trim()

    if (!target) return _full
    if (/^(https?:)?\/\//.test(target)) return `[${alias}](${target})`

    const normalizedTarget = target.replace(/\.md$/i, '').replace(/^\/+/, '')
    const link = normalizedTarget.startsWith('posts/')
      ? `/${normalizedTarget}`
      : `/posts/${normalizedTarget}`

    return `[${alias}](${link})`
  })
}
