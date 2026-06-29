import fs from 'node:fs'
import path from 'node:path'
import { convertObsidianLinksInText } from './content-utils.mjs'

const repoRoot = process.cwd()
const docsRoot = path.join(repoRoot, 'docs')
const knowledgeBaseRoot = path.join(docsRoot, 'knowledge-base')
const postsRoot = path.join(docsRoot, 'posts')
const tagsRoot = path.join(docsRoot, 'tags')
const generatedDir = path.join(docsRoot, '.vitepress', 'generated')
const generatedModulePath = path.join(generatedDir, 'content-data.mjs')

fs.mkdirSync(generatedDir, { recursive: true })

function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['assets', '.obsidian', '.git'].includes(entry.name)) continue
      files.push(...getMarkdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function splitFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: '', body: raw }
  }

  const end = normalized.indexOf('\n---\n', 4)
  if (end < 0) {
    return { frontmatter: '', body: raw }
  }

  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + 5)
  }
}

function parseTags(frontmatter, body) {
  const tags = new Set()
  const frontmatterTags = frontmatter.match(/(?:^|\n)tags:\s*\[([^\]]*)\]/m)
  if (frontmatterTags?.[1]) {
    for (const tag of frontmatterTags[1].split(',')) {
      const cleaned = tag.trim().replace(/^['"]|['"]$/g, '')
      if (cleaned) tags.add(cleaned)
    }
  }

  const blockTags = frontmatter.match(/(?:^|\n)tags:\s*\n((?:\s+-\s*.+(?:\n|$))+)/m)
  if (blockTags?.[1]) {
    for (const tag of blockTags[1].split('\n')) {
      const cleaned = tag.replace(/^\s+-\s*/, '').trim().replace(/^['"]|['"]$/g, '')
      if (cleaned) tags.add(cleaned)
    }
  }

  const hashtagMatches = body.match(/(^|\s)#([A-Za-z][\w-]*)/g) || []
  for (const match of hashtagMatches) {
    const tag = match.trim().slice(1)
    if (tag) tags.add(tag)
  }

  return [...tags].sort((a, b) => a.localeCompare(b))
}

function parseTitle(frontmatter, body, filename) {
  return filename.replace(/\.md$/, '')
}

function collectMarkdownEntries(rootDir) {
  const files = getMarkdownFiles(rootDir).filter((file) => path.basename(file) !== 'index.md')
  const entries = []

  for (const file of files) {
    const originalRaw = fs.readFileSync(file, 'utf8')
    const convertedRaw = convertObsidianLinksInText(originalRaw)

    const { frontmatter, body } = splitFrontmatter(convertedRaw)
    const rel = path.relative(docsRoot, file).replace(/\\/g, '/')
    const route = `/${rel.replace(/\.md$/, '')}`

    const tags = parseTags(frontmatter, body)
    const title = parseTitle(frontmatter, body, path.basename(file))

    const relativeToRoot = path.relative(rootDir, file)
    const folderPath = path.dirname(relativeToRoot)
    const categories =
      folderPath === '.'
        ? ['Unclassified']
        : folderPath.split(path.sep).map((segment) => segment.replace(/[-_]/g, ' '))

    entries.push({ title, route, tags, categories })
  }

  entries.sort((a, b) => a.title.localeCompare(b.title))
  return entries
}

const knowledgeBase = []
const tagsMap = new Map()
const postEntries = collectMarkdownEntries(knowledgeBaseRoot)

for (const post of postEntries) {
  knowledgeBase.push(post)

  for (const tag of post.tags) {
    if (!tagsMap.has(tag)) tagsMap.set(tag, [])
    tagsMap.get(tag).push(post)
  }
}

function makeSidebar(postsList) {
  const root = {}

  for (const post of postsList) {
    let categoryNode = root
    for (const category of post.categories) {
      if (!categoryNode[category]) {
        categoryNode[category] = { children: {} }
      }
      categoryNode = categoryNode[category].children
    }
    categoryNode.__posts = categoryNode.__posts || []
    categoryNode.__posts.push({ text: post.title, link: post.route })
  }

  function buildItems(treeNode) {
    const items = []

    for (const [name, value] of Object.entries(treeNode)) {
      if (name === '__posts') continue

      const nestedItems = buildItems(value.children)
      const directPosts = value.children.__posts || []

      items.push({
        text: name,
        collapsed: true,
        items: [...directPosts.sort((a, b) => a.text.localeCompare(b.text)), ...nestedItems]
      })
    }

    return items.sort((a, b) => a.text.localeCompare(b.text))
  }

  return buildItems(root)
}

const knowledgeBaseSidebar = makeSidebar(knowledgeBase)
const posts = collectMarkdownEntries(postsRoot)
const postsSidebar = makeSidebar(posts)

for (const [tag, list] of tagsMap.entries()) {
  list.sort((a, b) => a.title.localeCompare(b.title))
}

const allTags = [...tagsMap.keys()].sort((a, b) => a.localeCompare(b))

function tagPagePath(tag) {
  return path.join(tagsRoot, ...tag.split(/[\\/]/).filter(Boolean)) + '.md'
}

function tagPageRoute(tag) {
  return `/tags/${tag.split(/[\\/]/).filter(Boolean).map((segment) => encodeURIComponent(segment)).join('/')}`
}

function writeGeneratedTagPages() {
  fs.rmSync(tagsRoot, { recursive: true, force: true })
  fs.mkdirSync(tagsRoot, { recursive: true })

  const indexLines = ['# Tags', '', 'Browse knowledge-base notes by tag:', '']

  for (const tag of allTags) {
    indexLines.push(`- [#${tag}](${tagPageRoute(tag)})`)

    const entries = tagsMap.get(tag) || []
    const tagLines = [`# #${tag}`, '', 'Knowledge-base notes with this tag:', '']
    for (const entry of entries) {
      tagLines.push(`- [${entry.title}](${entry.route})`)
    }

    const filePath = tagPagePath(tag)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, `${tagLines.join('\n')}\n`)
  }

  fs.writeFileSync(path.join(tagsRoot, 'index.md'), `${indexLines.join('\n')}\n`)
}

writeGeneratedTagPages()

const moduleContent = `export const knowledgeBase = ${JSON.stringify(knowledgeBase, null, 2)}\n\nexport const knowledgeBaseSidebar = ${JSON.stringify(knowledgeBaseSidebar, null, 2)}\n\nexport const posts = ${JSON.stringify(posts, null, 2)}\n\nexport const postsSidebar = ${JSON.stringify(postsSidebar, null, 2)}\n\nexport const tags = ${JSON.stringify(allTags, null, 2)}\n`

fs.writeFileSync(generatedModulePath, moduleContent)
