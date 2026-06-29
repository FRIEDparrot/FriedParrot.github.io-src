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

  return `${frontmatter}# ${titleFromRelativePath(relativePath)}\n\n${tagMarkup}${body.trimStart()}`
}

export default defineConfig({
  title: 'FriedParrot',
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
    config(md) {
      md.core.ruler.before('normalize', 'knowledge-base-title', (state) => {
        state.src = ensureKnowledgeBaseTitle(state.src, state.env.relativePath, state.env.frontmatter)
      })
      md.core.ruler.before('normalize', 'obsidian-links', (state) => {
        state.src = convertObsidianLinksInText(state.src)
      })
    }
  }
})
