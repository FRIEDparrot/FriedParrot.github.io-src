export type PostRecord = {
  title: string
  url: string
  sourcePath: string
  categoryPath: string[]
  tags: string[]
}

const tagRegex = /(^|\s)#([a-zA-Z0-9][\w-]*)\b/g

const stripCodeBlocks = (source: string) => source.replace(/```[\s\S]*?```/g, '')

const stripFrontmatter = (source: string) => source.replace(/^---[\s\S]*?---\n?/, '')

export const extractTitle = (source: string, fallback: string) => {
  const titleInFrontmatter = source.match(/^---[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m)?.[1]
  if (titleInFrontmatter) return titleInFrontmatter.trim()

  const heading = stripFrontmatter(source).match(/^#\s+(.+)$/m)?.[1]
  if (heading) return heading.trim()

  return fallback
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const extractFrontmatterTags = (source: string): string[] => {
  const inline = source.match(/^---[\s\S]*?^tags:\s*\[(.*?)\]\s*$/m)?.[1]
  const inlineTags = inline
    ? inline
        .split(',')
        .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : []

  const block = source.match(/^---[\s\S]*?^tags:\s*\n((?:\s*-\s*.+\n?)*)/m)?.[1]
  const blockTags = block
    ? block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2).trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : []

  return [...inlineTags, ...blockTags]
}

const extractHashtagTags = (source: string): string[] => {
  const clean = stripCodeBlocks(stripFrontmatter(source))
  const matches = Array.from(clean.matchAll(tagRegex), (match) => match[2])
  return matches.map((tag) => tag.toLowerCase())
}

export const extractTags = (source: string) =>
  Array.from(new Set([...extractFrontmatterTags(source), ...extractHashtagTags(source)].map((tag) => tag.trim()).filter(Boolean)))

export const normalizeWikiLinks = (source: string) => {
  const splitByCodeFence = source.split(/(```[\s\S]*?```)/g)

  return splitByCodeFence
    .map((part) => {
      if (part.startsWith('```')) return part

      return part.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, rawTarget, rawLabel) => {
        const target = String(rawTarget).trim()
        const label = String(rawLabel || rawTarget).trim()
        if (!target) return _match

        const normalized = target
          .replace(/\\/g, '/')
          .replace(/\.md$/i, '')
          .trim()

        const href = normalized.startsWith('/') ? normalized : `/${normalized}`
        return `[${label}](${href})`
      })
    })
    .join('')
}
