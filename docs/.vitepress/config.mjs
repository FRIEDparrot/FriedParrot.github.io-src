import { defineConfig } from 'vitepress'
import { knowledgeBaseSidebar, postsSidebar } from './generated/content-data.mjs'
import equationCitatorMarkdownIt from '@friedparrot/equation-citator'
import markdownItFootnote from 'markdown-it-footnote'

const KNOWLEDGE_BASE_ROUTE_PREFIX = 'knowledge-base/'
const KNOWLEDGE_BASE_TAG_ROUTE_PREFIX = '/knowledge-base/_tags/'
const FRONTMATTER_BOUNDARY = '\n---\n'
const INLINE_TAGS_PATTERN = /(?:^|\n)tags:\s*\[([^\]]*)\]/m
const BLOCK_TAGS_PATTERN = /(?:^|\n)tags:\s*\n((?:\s+-\s*.+(?:\n|$))+)/m   // nosonar
const MARKDOWN_EXTENSION_PATTERN = /\.md$/i
const QUOTED_VALUE_BOUNDARY_PATTERN = /^['"]|['"]$/g
const TOP_LEVEL_HEADING_PATTERN = /^#\s+\S/
const FENCE_MARKER_PATTERN = /^\s*(```|~~~)/

function titleFromRelativePath(relativePath = '') {
  const filename = relativePath.split('/').pop() || ''
  return filename.replace(MARKDOWN_EXTENSION_PATTERN, '')
}

function splitFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { frontmatter: '', frontmatterContent: '', body: source }
  }

  const end = source.indexOf(FRONTMATTER_BOUNDARY, 4)
  if (end < 0) {
    return { frontmatter: '', frontmatterContent: '', body: source }
  }

  return {
    frontmatter: source.slice(0, end + 5),
    frontmatterContent: source.slice(4, end),
    body: source.slice(end + 5)
  }
}

function cleanFrontmatterTag(tag = '') {
  return tag.trim().replace(QUOTED_VALUE_BOUNDARY_PATTERN, '').replace(/^#/, '')
}

function parseTags(frontmatterContent = '') {
  const tags = new Set()
  const inlineTags = INLINE_TAGS_PATTERN.exec(frontmatterContent)
  if (inlineTags?.[1]) {
    for (const tag of inlineTags[1].split(',')) {
      const cleaned = cleanFrontmatterTag(tag)
      if (cleaned) tags.add(cleaned)
    }
  }

  const blockTags = BLOCK_TAGS_PATTERN.exec(frontmatterContent)
  if (blockTags?.[1]) {
    for (const tag of blockTags[1].split('\n')) {
      const cleaned = cleanFrontmatterTag(tag.replace(/^\s+-\s*/, ''))
      if (cleaned) tags.add(cleaned)
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b))
}

function tagTone(tag) {
  let hash = 0
  for (const char of tag) {
    hash = (hash * 31 + char.charCodeAt(0)) % Number.MAX_SAFE_INTEGER   // nosonar
  }
  return hash % 8
}

function tagListingRoute(tag) {
  const encodedSegments = tag
    .split(/[\\/]/)
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${KNOWLEDGE_BASE_TAG_ROUTE_PREFIX}${encodedSegments}/`
}

function renderKnowledgeBaseTags(tags) {
  if (!tags.length) return ''

  const badges = tags
    .map((tag) => {
      const href = escapeHtmlAttribute(tagListingRoute(tag))
      const label = escapeHtmlAttribute(tag)
      return `<a class="knowledge-tag tag-tone-${tagTone(tag)}" href="${href}">#${label}</a>`
    })
    .join('')

  return `<div class="knowledge-tags">${badges}</div>\n\n`
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return []

  const cleanedTags = value
    .filter((tag) => typeof tag === 'string' && tag.trim())
    .map((tag) => cleanFrontmatterTag(tag))

  return [...new Set(cleanedTags)].sort((a, b) => a.localeCompare(b))
}

function escapeHtmlAttribute(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function hasTopLevelHeading(source) {
  let inFence = false

  for (const line of source.split('\n')) {
    if (FENCE_MARKER_PATTERN.test(line)) {
      inFence = !inFence
      continue
    }

    if (!inFence && TOP_LEVEL_HEADING_PATTERN.test(line)) return true
  }

  return false
}

function insertAfterFirstTopLevelHeading(body, content) {
  const lines = body.split('\n')
  const headingIndex = lines.findIndex((line) => TOP_LEVEL_HEADING_PATTERN.test(line))
  if (headingIndex < 0) return body

  lines.splice(headingIndex + 1, 0, '', content.trimEnd())
  return lines.join('\n')
}

function ensureKnowledgeBaseTitle(source, relativePath = '', frontmatterData = {}) {
  if (!relativePath.startsWith(KNOWLEDGE_BASE_ROUTE_PREFIX) || relativePath.endsWith('/index.md')) {
    return source
  }

  const { frontmatter, frontmatterContent, body } = splitFrontmatter(source.replaceAll('\r\n', '\n'))
  const normalizedFrontmatterTags = normalizeTags(frontmatterData.tags)
  const tags = normalizedFrontmatterTags.length
    ? normalizedFrontmatterTags
    : parseTags(frontmatterContent)
  const tagMarkup = renderKnowledgeBaseTags(tags)

  if (hasTopLevelHeading(body)) {
    return `${frontmatter}${insertAfterFirstTopLevelHeading(body, tagMarkup)}`
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
      md.use(markdownItFootnote)
      md.use(equationCitatorMarkdownIt, {
        enableObsidianCallouts: true,
        logEmbedLinkRemapping: false,
        useHeadingIdSlug: true,
        pathMapping: [{ '/knowledge-base': 'docs/knowledge-base' }],
      })
      md.core.ruler.before('inline', 'repo-markdown-path', (state) => {
        state.env.markdownPath = state.env.relativePath ? `docs/${state.env.relativePath}` : ''
      })
      md.core.ruler.before('normalize', 'knowledge-base-title', (state) => {
        state.src = ensureKnowledgeBaseTitle(state.src, state.env.relativePath, state.env.frontmatter)
      })
    }
  }
})
