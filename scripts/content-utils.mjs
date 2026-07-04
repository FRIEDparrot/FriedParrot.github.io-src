import fs from 'node:fs'
import path from 'node:path'

function escapeHtmlAttribute(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseEmbedMetadata(rawAlias = '', fallbackLabel = '') {
  const parts = rawAlias
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  const metadata = {
    label: fallbackLabel,
    title: '',
    desc: '',
    width: '',
    figureTag: ''
  }

  for (const part of parts) {
    const figureMatch = part.match(/^(?:fig|figure)\s*:\s*(.+)$/i)
    if (figureMatch) {
      metadata.figureTag = figureMatch[1].trim()
      continue
    }

    const titleMatch = part.match(/^title\s*:\s*(.*)$/i)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim()
      continue
    }

    const descMatch = part.match(/^desc\s*:\s*(.*)$/i)
    if (descMatch) {
      metadata.desc = descMatch[1].trim()
      continue
    }

    if (/^\d+$/.test(part)) {
      metadata.width = part
      continue
    }

    metadata.label = part
  }

  return metadata
}

function renderFigureMetadataAttributes(metadata) {
  if (!metadata.figureTag) return ''

  const attrs = [
    'class="equation-citator-target equation-citator-figure"',
    'data-ec-kind="fig"',
    `data-ec-tag="${escapeHtmlAttribute(metadata.figureTag)}"`
  ]

  if (metadata.title) attrs.push(`data-title="${escapeHtmlAttribute(metadata.title)}"`)
  if (metadata.desc) attrs.push(`data-desc="${escapeHtmlAttribute(metadata.desc)}"`)
  if (metadata.width) {
    attrs.push(`data-width="${metadata.width}"`)
    attrs.push(`style="width: ${metadata.width}px; max-width: 100%;"`)
  }

  return ` ${attrs.join(' ')}`
}

function renderFigureWrapperAttributes(metadata) {
  if (!metadata.figureTag) return ''

  const attrs = [
    'class="equation-citator-target equation-citator-figure equation-citator-figure-wrapper"',
    'data-ec-kind="fig"',
    `data-ec-tag="${escapeHtmlAttribute(metadata.figureTag)}"`
  ]

  if (metadata.title) attrs.push(`data-title="${escapeHtmlAttribute(metadata.title)}"`)
  if (metadata.desc) attrs.push(`data-desc="${escapeHtmlAttribute(metadata.desc)}"`)
  if (metadata.width) {
    attrs.push(`data-width="${metadata.width}"`)
    attrs.push(`style="width: ${metadata.width}px; max-width: 100%;"`)
  }

  return attrs.join(' ')
}

function localKnowledgeBasePageExists(targetPath) {
  const normalized = targetPath
    .replace(/#.*$/, '')
    .replace(/^\/+/, '')
    .replace(/\.md$/i, '')

  if (!normalized) return true

  const pagePath = normalized.startsWith('knowledge-base/')
    ? normalized
    : `knowledge-base/${normalized}`

  return fs.existsSync(path.join(process.cwd(), 'docs', ...`${pagePath}.md`.split('/'))) ||
    fs.existsSync(path.join(process.cwd(), 'docs', ...pagePath.split('/'), 'index.md'))
}

function isStandaloneEmbedLine(source, offset, fullMatch) {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1
  const nextLineStart = source.indexOf('\n', offset)
  const lineEnd = nextLineStart === -1 ? source.length : nextLineStart
  const before = source.slice(lineStart, offset)
  const after = source.slice(offset + fullMatch.length, lineEnd)
  const normalizedBefore = before.replace(/^(?:[ \t]*>[ \t]?)*[ \t]*/, '')

  return normalizedBefore === '' && /^[ \t]*$/.test(after)
}

function docsPathExists(targetPath) {
  const normalized = targetPath.replace(/^\/+/, '')
  return fs.existsSync(path.join(process.cwd(), 'docs', ...normalized.split('/')))
}

function resolveEmbedTargetPath(target, relativePath = '') {
  const [targetWithoutHash, hash = ''] = target.split('#')
  const normalizedTarget = targetWithoutHash.replace(/^\/+/, '')
  if (/^(https?:)?\/\//.test(target)) return target
  if (normalizedTarget.startsWith('knowledge-base/')) return normalizedTarget

  const baseDir = relativePath
    ? path.posix.dirname(relativePath.replace(/\\/g, '/'))
    : 'knowledge-base'

  const candidates = []
  if (normalizedTarget.includes('/')) {
    candidates.push(normalizedTarget)
    candidates.push(`knowledge-base/${normalizedTarget}`)
  } else {
    candidates.push(`${baseDir}/${normalizedTarget}`)
    candidates.push(`knowledge-base/assets/${normalizedTarget}`)
    candidates.push(`knowledge-base/${normalizedTarget}`)
  }

  const existing = candidates.find((candidate) => docsPathExists(candidate))
  const resolved = existing || candidates[0]
  return hash ? `${resolved}#${hash}` : resolved
}

function encodedDocsLink(targetPath) {
  if (/^(https?:)?\/\//.test(targetPath)) return targetPath

  const [pathWithoutHash, hash = ''] = targetPath.split('#')
  const link = pathWithoutHash.startsWith('knowledge-base/')
    ? `/${pathWithoutHash}`
    : `/knowledge-base/${pathWithoutHash}`
  const encodedPath = link.split('/').map((part) => encodeURIComponent(part)).join('/')

  if (!hash) return encodedPath

  const slug = headingSlug(hash)
  return slug ? `${encodedPath}#${slug}` : `${encodedPath}#`
}

function relativeMarkdownLink(fromRelativePath = '', targetPath = '') {
  const fromDir = path.posix.dirname(fromRelativePath.replace(/\\/g, '/') || 'knowledge-base/index.md')
  const relative = path.posix.relative(fromDir, targetPath.replace(/\\/g, '/'))
  const link = relative.startsWith('.') ? relative : `./${relative}`
  return link.split('/').map((part) => encodeURIComponent(part)).join('/')
}

function markdownImageAlt(target, rawAlias = '') {
  return rawAlias?.trim() || target
}

function headingSlug(rawHeading = '') {
  const slug = rawHeading
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) return ''
  return /^\d/.test(slug) ? `_${slug}` : slug
}

function sectionHrefFromTarget(target = '') {
  if (!target.startsWith('#')) return ''

  const heading = target.slice(1).trim()
  const slug = headingSlug(heading)
  return slug ? `#${slug}` : '#'
}

function renderSectionReferenceEmbed(target, metadata) {
  const href = sectionHrefFromTarget(target)
  const text = 'This is a section reference, click here to jump'
  const link = `<a class="equation-citator-section-reference" href="${escapeHtmlAttribute(href)}">${text}</a>`

  if (!metadata.figureTag) return link

  return `<figure ${renderFigureWrapperAttributes(metadata)}><p>${link}</p></figure>`
}

export function convertObsidianLinksInText(content, options = {}) {
  return content.replace(/(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_full, rawEmbed, rawTarget, rawAlias, offset, source) => {
    const target = rawTarget.trim()
    const alias = (rawAlias || rawTarget).trim()
    const metadata = parseEmbedMetadata(rawAlias || '', target)

    if (!target) return _full
    if (/^(https?:)?\/\//.test(target)) return `${rawEmbed}[${alias}](${target})`

    if (rawEmbed === '!') {
      if (!isStandaloneEmbedLine(source, offset, _full)) return _full

      if (target.startsWith('#')) {
        return renderSectionReferenceEmbed(target, metadata)
      }

      const targetPath = resolveEmbedTargetPath(target, options.relativePath)
      const rawAlt = markdownImageAlt(target, rawAlias || '')

      if (docsPathExists(targetPath) && !target.includes('#')) {
        return `![${rawAlt}](${relativeMarkdownLink(options.relativePath, targetPath)})`
      }

      const encodedLink = encodedDocsLink(targetPath)
      const width = metadata.width ? ` width="${metadata.width}"` : ''
      const alt = metadata.title || metadata.desc || metadata.label || target
      const missingSrc = ` data-missing-src="${escapeHtmlAttribute(encodedLink)}"`

      if (metadata.figureTag) {
        return `<figure ${renderFigureWrapperAttributes(metadata)}><p><img src="data:," alt="${escapeHtmlAttribute(alt)}"${width}${missingSrc}></p></figure>`
      }

      return `<img src="data:," alt="${escapeHtmlAttribute(alt)}"${width}${renderFigureMetadataAttributes(metadata)}${missingSrc}>`
    }

    const normalizedTarget = target.replace(/\.md$/i, '').replace(/^\/+/, '')
    const targetPath = resolveEmbedTargetPath(normalizedTarget, options.relativePath)
    const encodedLink = encodedDocsLink(targetPath)

    if (!localKnowledgeBasePageExists(targetPath)) {
      const href = target.startsWith('#') ? sectionHrefFromTarget(target) : encodedLink
      return `${rawEmbed}<a class="obsidian-link-placeholder" href="${escapeHtmlAttribute(href)}">${escapeHtmlAttribute(alias)}</a>`
    }

    if (target.startsWith('#')) {
      return `${rawEmbed}<a href="${escapeHtmlAttribute(sectionHrefFromTarget(target))}">${escapeHtmlAttribute(alias)}</a>`
    }

    return `${rawEmbed}[${alias}](${encodedLink})`
  })
}
