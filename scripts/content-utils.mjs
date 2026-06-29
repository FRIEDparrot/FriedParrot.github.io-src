export function convertObsidianLinksInText(content) {
  return content.replace(/(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, rawEmbed, rawTarget, rawAlias) => {
    const target = rawTarget.trim()
    const alias = (rawAlias || rawTarget).trim()

    if (!target) return _full
    if (/^(https?:)?\/\//.test(target)) return `${rawEmbed}[${alias}](${target})`

    const normalizedTarget = target.replace(/\.md$/i, '').replace(/^\/+/, '')
    const isImage = rawEmbed === '!' && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(target)
    const targetPath = isImage && !normalizedTarget.includes('/')
      ? `knowledge-base/assets/${normalizedTarget}`
      : normalizedTarget
    const link = targetPath.startsWith('knowledge-base/')
      ? `/${targetPath}`
      : `/knowledge-base/${targetPath}`
    const encodedLink = link.split('/').map((part) => encodeURIComponent(part)).join('/')

    if (isImage) {
      const width = /^\d+$/.test(alias) ? ` width="${alias}"` : ''
      const alt = /^\d+$/.test(alias) ? target : alias
      return `<img src="${encodedLink}" alt="${alt}"${width}>`
    }

    return `${rawEmbed}[${alias}](${encodedLink})`
  })
}
