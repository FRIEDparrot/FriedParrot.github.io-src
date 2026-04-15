import fs from 'node:fs'
import path from 'node:path'
import { convertObsidianLinksInText } from './content-utils.mjs'

const repoRoot = process.cwd()
const docsRoot = path.join(repoRoot, 'docs')
const postsRoot = path.join(docsRoot, 'posts')
const generatedDir = path.join(docsRoot, '.vitepress', 'generated')
const generatedModulePath = path.join(generatedDir, 'content-data.mjs')
const tagsRoot = path.join(docsRoot, 'tags')

fs.mkdirSync(generatedDir, { recursive: true })
fs.mkdirSync(tagsRoot, { recursive: true })

function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n')) {
    return { frontmatter: '', body: raw }
  }

  const end = raw.indexOf('\n---\n', 4)
  if (end < 0) {
    return { frontmatter: '', body: raw }
  }

  return {
    frontmatter: raw.slice(4, end),
    body: raw.slice(end + 5)
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

  const hashtagMatches = body.match(/(^|\s)#([A-Za-z0-9][\w-]*)/g) || []
  for (const match of hashtagMatches) {
    const tag = match.trim().slice(1)
    if (tag) tags.add(tag)
  }

  return [...tags].sort((a, b) => a.localeCompare(b))
}

function parseTitle(frontmatter, body, filename) {
  const fromFrontmatter = frontmatter.match(/(?:^|\n)title:\s*(.+)/)
  if (fromFrontmatter?.[1]) {
    return fromFrontmatter[1].trim().replace(/^['"]|['"]$/g, '')
  }

  const fromHeading = body.match(/^#\s+(.+)$/m)
  if (fromHeading?.[1]) {
    return fromHeading[1].trim()
  }

  return filename.replace(/\.md$/, '')
}

function slugifyTag(tag) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

const nonIndexPostFiles = getMarkdownFiles(postsRoot).filter((file) => path.basename(file) !== 'index.md')
const posts = []
const tagsMap = new Map()

for (const file of nonIndexPostFiles) {
  const originalRaw = fs.readFileSync(file, 'utf8')
  const convertedRaw = convertObsidianLinksInText(originalRaw)

  const { frontmatter, body } = splitFrontmatter(convertedRaw)
  const rel = path.relative(docsRoot, file).replace(/\\/g, '/')
  const route = `/${rel.replace(/\.md$/, '')}`

  const tags = parseTags(frontmatter, body)
  const title = parseTitle(frontmatter, body, path.basename(file))

  const relativeToPosts = path.relative(postsRoot, file)
  const folderPath = path.dirname(relativeToPosts)
  const categories =
    folderPath === '.'
      ? ['Unclassified']
      : folderPath.split(path.sep).map((segment) => segment.replace(/[-_]/g, ' '))

  const post = { title, route, tags, categories }
  posts.push(post)

  for (const tag of tags) {
    if (!tagsMap.has(tag)) tagsMap.set(tag, [])
    tagsMap.get(tag).push(post)
  }
}

posts.sort((a, b) => a.title.localeCompare(b.title))

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

  return [
    {
      text: 'Post Categories',
      collapsed: false,
      items: buildItems(root)
    }
  ]
}

const sidebar = makeSidebar(posts)

for (const [tag, list] of tagsMap.entries()) {
  list.sort((a, b) => a.title.localeCompare(b.title))
}

const allTags = [...tagsMap.keys()].sort((a, b) => a.localeCompare(b))

const tagsIndexLines = [
  '# Tags',
  '',
  allTags.length ? 'Browse posts by tag:' : 'No tags found yet.',
  ''
]

for (const existingTagFile of fs.readdirSync(tagsRoot)) {
  if (existingTagFile.endsWith('.md')) {
    fs.unlinkSync(path.join(tagsRoot, existingTagFile))
  }
}

for (const tag of allTags) {
  tagsIndexLines.push(`- [#${tag}](/tags/${slugifyTag(tag)})`)
}

fs.writeFileSync(path.join(tagsRoot, 'index.md'), `${tagsIndexLines.join('\n')}\n`)

for (const tag of allTags) {
  const tagPageLines = [`# #${tag}`, '', 'Posts with this tag:', '']
  for (const post of tagsMap.get(tag)) {
    tagPageLines.push(`- [${post.title}](${post.route})`)
  }
  fs.writeFileSync(path.join(tagsRoot, `${slugifyTag(tag)}.md`), `${tagPageLines.join('\n')}\n`)
}

const moduleContent = `export const posts = ${JSON.stringify(posts, null, 2)}\n\nexport const sidebar = ${JSON.stringify(sidebar, null, 2)}\n\nexport const tags = ${JSON.stringify(allTags, null, 2)}\n`

fs.writeFileSync(generatedModulePath, moduleContent)
