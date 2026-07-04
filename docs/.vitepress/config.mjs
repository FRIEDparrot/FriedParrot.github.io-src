import { defineConfig } from 'vitepress'
import { knowledgeBaseSidebar, postsSidebar } from './generated/content-data.mjs'
import { convertObsidianLinksInText } from '../../scripts/content-utils.mjs'

function titleFromRelativePath(relativePath = '') {
  const filename = relativePath.split('/').pop() || ''
  return filename.replace(/\.md$/i, '')
}

function splitFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { frontmatter: '', frontmatterContent: '', body: source }
  }

  const end = source.indexOf('\n---\n', 4)
  if (end < 0) {
    return { frontmatter: '', frontmatterContent: '', body: source }
  }

  return {
    frontmatter: source.slice(0, end + 5),
    frontmatterContent: source.slice(4, end),
    body: source.slice(end + 5)
  }
}

function parseTags(frontmatterContent = '') {
  const tags = new Set()
  const inlineTags = frontmatterContent.match(/(?:^|\n)tags:\s*\[([^\]]*)\]/m)
  if (inlineTags?.[1]) {
    for (const tag of inlineTags[1].split(',')) {
      const cleaned = tag.trim().replace(/^['"]|['"]$/g, '')
      if (cleaned) tags.add(cleaned)
    }
  }

  const blockTags = frontmatterContent.match(/(?:^|\n)tags:\s*\n((?:\s+-\s*.+(?:\n|$))+)/m)
  if (blockTags?.[1]) {
    for (const tag of blockTags[1].split('\n')) {
      const cleaned = tag.replace(/^\s+-\s*/, '').trim().replace(/^['"]|['"]$/g, '')
      if (cleaned) tags.add(cleaned)
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b))
}

function tagTone(tag) {
  let hash = 0
  for (const char of tag) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash % 8
}

function tagListingRoute(tag) {
  return `/knowledge-base/_tags/${tag.split(/[\\/]/).filter(Boolean).map((segment) => encodeURIComponent(segment)).join('/')}/`
}

function renderKnowledgeBaseTags(tags) {
  if (!tags.length) return ''

  const badges = tags
    .map((tag) => `<a class="knowledge-tag tag-tone-${tagTone(tag)}" href="${tagListingRoute(tag)}">#${tag}</a>`)
    .join('')

  return `<div class="knowledge-tags">${badges}</div>\n\n`
}

function normalizeTags(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()))]
        .sort((a, b) => a.localeCompare(b))
    : []
}

function escapeHtmlAttribute(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function equationTagAttribute(content = '') {
  const tag = content.match(/\\tag\s*\{([^{}]+)\}/)?.[1]?.trim()
  if (!tag) return ''

  const escapedTag = escapeHtmlAttribute(tag)
  return ` data-ec-tag="${escapedTag}" data-tag="${escapedTag}"`
}

function parseHtmlAttributes(raw = '') {
  const attrs = {}

  for (const match of raw.matchAll(/\s([:@A-Za-z_][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attrs
}

function parseEquationCitatorFigureLabel(raw = '') {
  const parts = String(raw)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  const metadata = {
    tag: '',
    title: '',
    desc: '',
    width: '',
    label: ''
  }

  for (const part of parts) {
    const figureMatch = part.match(/^(?:fig|figure)\s*:\s*(.+)$/i)
    if (figureMatch) {
      metadata.tag = figureMatch[1].trim()
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

  return metadata.tag ? metadata : null
}

function figureAttrsFromMetadata(metadata) {
  const attrs = {
    class: 'equation-citator-target equation-citator-figure',
    'data-ec-kind': 'fig',
    'data-ec-tag': metadata.tag
  }

  if (metadata.title) attrs['data-title'] = metadata.title
  if (metadata.desc) attrs['data-desc'] = metadata.desc
  if (metadata.width) {
    attrs['data-width'] = metadata.width
    attrs.style = `width: ${metadata.width}px; max-width: 100%;`
  }

  return attrs
}

function normalizeFigureAttrs(attrs = {}) {
  if (!['fig', 'figure'].includes(attrs['data-ec-kind']) || !attrs['data-ec-tag']) return null

  const normalized = {
    class: 'equation-citator-target equation-citator-figure',
    'data-ec-kind': 'fig',
    'data-ec-tag': attrs['data-ec-tag']
  }

  if (attrs['data-title']) normalized['data-title'] = attrs['data-title']
  if (attrs['data-desc']) normalized['data-desc'] = attrs['data-desc']
  if (attrs['data-width'] || attrs.width) {
    const width = attrs['data-width'] || attrs.width
    normalized['data-width'] = width
    normalized.style = `width: ${width}px; max-width: 100%;`
  }

  return normalized
}

function parseEquationCitatorCalloutLabel(raw = '') {
  const match = String(raw).match(/^\s*\[!([A-Za-z][\w-]*(?::[^\]\s|]+)(?:\|[^\]]*)?)\](?:[ \t]*(.*))?$/s)
  if (!match) return null

  const [kindAndTag] = match[1].split('|')
  const separator = kindAndTag.indexOf(':')
  if (separator < 0) return null

  const kind = kindAndTag.slice(0, separator).trim()
  const tag = kindAndTag.slice(separator + 1).trim()
  if (!kind || !tag) return null

  return {
    title: match[2] || '',
    attrs: {
      class: 'equation-citator-target equation-citator-callout',
      'data-ec-kind': kind.toLowerCase(),
      'data-ec-callout-kind': kind,
      'data-ec-tag': tag
    }
  }
}

function findEquationCitatorMarker(token) {
  const children = token?.children || []
  const htmlToken = children.find((child) =>
    child.type === 'html_inline' &&
    /<span\b/i.test(child.content) &&
    /\bequation-citator-target\b/.test(child.content) &&
    /\bdata-ec-kind=/.test(child.content)
  )

  if (!htmlToken) return null

  const attrs = parseHtmlAttributes(htmlToken.content)
  if (!attrs['data-ec-kind']) return null

  return attrs
}

function removeEquationCitatorMarker(token) {
  if (!token?.children) return

  const children = []
  let skipClosingSpan = false

  for (const child of token.children) {
    if (
      child.type === 'html_inline' &&
      /<span\b/i.test(child.content) &&
      /\bequation-citator-target\b/.test(child.content)
    ) {
      skipClosingSpan = true
      continue
    }

    if (skipClosingSpan && child.type === 'html_inline' && child.content.trim() === '</span>') {
      skipClosingSpan = false
      continue
    }

    skipClosingSpan = false
    children.push(child)
  }

  token.children = children
}

function tokenContainsClass(token, className) {
  return (token?.children || []).some((child) =>
    child.type === 'html_inline' &&
    child.content.includes(className)
  )
}

function paragraphInlineAt(tokens, index) {
  return tokens[index]?.type === 'paragraph_open' &&
    tokens[index + 1]?.type === 'inline' &&
    tokens[index + 2]?.type === 'paragraph_close'
    ? tokens[index + 1]
    : null
}

function removeParagraphAt(tokens, index) {
  tokens.splice(index, 3)
}

function addMarkerAttrs(token, attrs, extraClass = '') {
  const classes = [attrs.class, extraClass].filter(Boolean).join(' ')
  if (classes) token.attrJoin('class', classes)

  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') continue
    if (name === 'style' || name.startsWith('data-')) token.attrSet(name, value)
  }
}

function makeElementToken(Token, type, tag, nesting) {
  const token = new Token(type, tag, nesting)
  return token
}

function isFigureImageToken(token) {
  const content = token?.content?.trim() || ''
  const children = token?.children || []

  return /^<img\b/i.test(content) ||
    children.some((child) => child.type === 'image') ||
    children.some((child) =>
      child.type === 'html_inline' &&
      /^<img\b/i.test(child.content.trim())
    )
}

function findFigureAttrs(token) {
  for (const child of token?.children || []) {
    if (child.type === 'image') {
      const metadata = parseEquationCitatorFigureLabel(child.content)
      if (!metadata) continue

      if (metadata.width) child.attrSet('width', metadata.width)

      const alt = metadata.label || metadata.title || metadata.desc
      if (alt) child.attrSet('alt', alt)

      return figureAttrsFromMetadata(metadata)
    }

    if (child.type === 'html_inline') {
      const attrs = parseHtmlAttributes(child.content)
      const figureAttrs = normalizeFigureAttrs(attrs)
      if (figureAttrs) return figureAttrs
    }
  }

  return null
}

function figureWrapEnd(tokens, imageOpenIndex) {
  let end = imageOpenIndex + 3
  let cursor = end

  while (cursor < tokens.length) {
    const inline = paragraphInlineAt(tokens, cursor)
    if (
      inline &&
      (tokenContainsClass(inline, 'ec-pdf-figure-title-marker') ||
        tokenContainsClass(inline, 'ec-pdf-figure-desc-marker'))
    ) {
      end = cursor + 3
      cursor = end
      continue
    }

    break
  }

  return end
}

function wrapExportedFigure(tokens, markerOpenIndex, attrs, Token) {
  const markerInline = paragraphInlineAt(tokens, markerOpenIndex)
  if (isFigureImageToken(markerInline)) {
    removeEquationCitatorMarker(markerInline)

    const end = figureWrapEnd(tokens, markerOpenIndex)
    const figureOpen = makeElementToken(Token, 'equation_citator_figure_open', 'figure', 1)
    const figureClose = makeElementToken(Token, 'equation_citator_figure_close', 'figure', -1)
    addMarkerAttrs(figureOpen, attrs, 'equation-citator-figure-wrapper')
    const wrapped = [
      figureOpen,
      ...tokens.slice(markerOpenIndex, end),
      figureClose
    ]

    tokens.splice(markerOpenIndex, end - markerOpenIndex, ...wrapped)
    return wrapped.length
  }

  const imageInline = paragraphInlineAt(tokens, markerOpenIndex + 3)
  if (!isFigureImageToken(imageInline)) return 0

  const start = markerOpenIndex + 3
  const end = figureWrapEnd(tokens, start)
  const figureOpen = makeElementToken(Token, 'equation_citator_figure_open', 'figure', 1)
  const figureClose = makeElementToken(Token, 'equation_citator_figure_close', 'figure', -1)
  addMarkerAttrs(figureOpen, attrs, 'equation-citator-figure-wrapper')
  const wrapped = [
    figureOpen,
    ...tokens.slice(start, end),
    figureClose
  ]

  tokens.splice(markerOpenIndex, end - markerOpenIndex, ...wrapped)
  return wrapped.length
}

function wrapParsedFigure(tokens, imageOpenIndex, attrs, Token) {
  const imageInline = paragraphInlineAt(tokens, imageOpenIndex)
  if (!isFigureImageToken(imageInline)) return 0

  const end = figureWrapEnd(tokens, imageOpenIndex)
  const figureOpen = makeElementToken(Token, 'equation_citator_figure_open', 'figure', 1)
  const figureClose = makeElementToken(Token, 'equation_citator_figure_close', 'figure', -1)
  addMarkerAttrs(figureOpen, attrs, 'equation-citator-figure-wrapper')
  const wrapped = [
    figureOpen,
    ...tokens.slice(imageOpenIndex, end),
    figureClose
  ]

  tokens.splice(imageOpenIndex, end - imageOpenIndex, ...wrapped)
  return wrapped.length
}

function wrapExportedCallout(tokens, markerOpenIndex, attrs) {
  for (let index = markerOpenIndex - 1; index >= 0; index -= 1) {
    const token = tokens[index]

    if (token.type === 'blockquote_close') return false
    if (token.type !== 'blockquote_open') continue

    addMarkerAttrs(token, attrs, 'equation-citator-callout-wrapper')
    removeParagraphAt(tokens, markerOpenIndex)
    return true
  }

  return false
}

function removeCalloutLabel(inline, Token) {
  const updated = inline.content.replace(/^\s*\[![^\]]+\][ \t]*/s, '')
  inline.content = updated

  let labelRemoved = false
  const children = []

  for (const child of inline.children || []) {
    if (!labelRemoved && child.type === 'text') {
      const nextContent = child.content.replace(/^\s*\[![^\]]+\][ \t]*/s, '')
      labelRemoved = nextContent !== child.content
      if (nextContent) {
        child.content = nextContent
        children.push(child)
      }
      continue
    }

    children.push(child)
  }

  if (!labelRemoved && updated) {
    const textToken = makeElementToken(Token, 'text', '', 0)
    textToken.content = updated
    children.push(textToken)
  }

  inline.children = children
}

function wrapParsedCallout(tokens, blockquoteOpenIndex, Token) {
  if (tokens[blockquoteOpenIndex]?.type !== 'blockquote_open') return false

  const inline = paragraphInlineAt(tokens, blockquoteOpenIndex + 1)
  const parsed = parseEquationCitatorCalloutLabel(inline?.content)
  if (!parsed) return false

  addMarkerAttrs(tokens[blockquoteOpenIndex], parsed.attrs, 'equation-citator-callout-wrapper')
  removeCalloutLabel(inline, Token)

  if (!inline.content.trim() && !(inline.children || []).length) {
    removeParagraphAt(tokens, blockquoteOpenIndex + 1)
  }

  return true
}

function wrapEquationCitatorExports(md) {
  md.core.ruler.after('inline', 'equation-citator-exports', (state) => {
    if (!state.env.relativePath?.startsWith('knowledge-base/')) return

    const { tokens, Token } = state
    const figureKinds = ['fig', 'figure']
    const nonCalloutKinds = ['eq', 'equation', ...figureKinds]
    for (let index = 0; index < tokens.length; index += 1) {
      if (wrapParsedCallout(tokens, index, Token)) {
        continue
      }

      const inline = paragraphInlineAt(tokens, index)
      const marker = findEquationCitatorMarker(inline)
      if (marker) {
        if (figureKinds.includes(marker['data-ec-kind'])) {
          const consumed = wrapExportedFigure(tokens, index, marker, Token)
          if (consumed) {
            index += consumed - 1
            continue
          }
        }

        const isCalloutMarker = /\bequation-citator-callout\b/.test(marker.class || '') ||
          !nonCalloutKinds.includes(marker['data-ec-kind'])
        if (isCalloutMarker && wrapExportedCallout(tokens, index, marker)) {
          index -= 1
          continue
        }
      }

      const figureAttrs = findFigureAttrs(inline)
      if (figureAttrs) {
        const consumed = wrapParsedFigure(tokens, index, figureAttrs, Token)
        if (consumed) index += consumed - 1
      }
    }
  })
}

function wrapEquationBlocks(md) {
  const renderMathBlock = md.renderer.rules.math_block
  if (!renderMathBlock) return

  md.renderer.rules.math_block = (tokens, idx, options, env, self) => {
    const rendered = renderMathBlock(tokens, idx, options, env, self)
    if (!env.relativePath?.startsWith('knowledge-base/')) return rendered

    return `<div class="equation-citator-target equation-citator-equation" data-ec-kind="eq" ${equationTagAttribute(tokens[idx].content)}>${rendered}</div>`
  }
}

function hasTopLevelHeading(source) {
  let inFence = false

  for (const line of source.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }

    if (!inFence && /^#\s+\S/.test(line)) return true
  }

  return false
}

function ensureKnowledgeBaseTitle(source, relativePath = '', frontmatterData = {}) {
  if (!relativePath.startsWith('knowledge-base/') || relativePath.endsWith('/index.md')) {
    return source
  }

  const { frontmatter, frontmatterContent, body } = splitFrontmatter(source.replace(/\r\n/g, '\n'))
  const tags = normalizeTags(frontmatterData.tags).length
    ? normalizeTags(frontmatterData.tags)
    : parseTags(frontmatterContent)
  const tagMarkup = renderKnowledgeBaseTags(tags)

  if (hasTopLevelHeading(body)) {
    return `${frontmatter}${body.replace(/^(#\s+\S.*\n+)/m, `$1\n${tagMarkup}`)}`
  }

  return `${frontmatter}<h1 class="knowledge-page-title">${escapeHtmlAttribute(titleFromRelativePath(relativePath))}</h1>\n\n${tagMarkup}${body.trimStart()}`
}

export default defineConfig({
  title: "FriedParrot's Website",
  description: 'Personal blog and project knowledge base',
  lastUpdated: true,
  base: '/',
  lang: 'en-US',
  appearance: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon.png' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Knowledge Base', link: '/knowledge-base/' },
      { text: 'Posts', link: '/posts/' },
      { text: 'Projects', link: '/projects' },
      { text: 'About Me', link: '/about' }
    ],
    search: {
      provider: 'local'
    },
    outline: [1, 3],
    outlineTitle: 'Outline',
    sidebar: {
      '/knowledge-base/': knowledgeBaseSidebar,
      '/posts/': postsSidebar
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/FRIEDparrot' }]
  },
  markdown: {
    lineNumbers: true,
    math: true,
    config(md) {
      wrapEquationBlocks(md)
      wrapEquationCitatorExports(md)
      md.core.ruler.before('normalize', 'knowledge-base-title', (state) => {
        state.src = ensureKnowledgeBaseTitle(state.src, state.env.relativePath, state.env.frontmatter)
      })
      md.core.ruler.before('normalize', 'obsidian-links', (state) => {
        state.src = convertObsidianLinksInText(state.src, { relativePath: state.env.relativePath })
      })
    }
  }
})
