import fs from 'node:fs'
import path from 'node:path'
import { convertObsidianLinksInText } from './content-utils.mjs'

const repoRoot = process.cwd()
const docsRoot = path.join(repoRoot, 'docs')
const knowledgeBaseRoot = path.join(docsRoot, 'knowledge-base')
const postsRoot = path.join(docsRoot, 'posts')
const tagsRoot = path.join(docsRoot, 'tags')
const knowledgeBaseTagsRoot = path.join(knowledgeBaseRoot, '_tags')
const generatedDir = path.join(docsRoot, '.vitepress', 'generated')
const generatedModulePath = path.join(generatedDir, 'content-data.mjs')
const generatedListingMarker = '<!-- AUTO-GENERATED: knowledge-base-listing -->'

fs.mkdirSync(generatedDir, { recursive: true })

function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['assets', '.obsidian', '.git', '_tags'].includes(entry.name)) continue
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
    if (originalRaw.startsWith(generatedListingMarker)) continue

    const convertedRaw = convertObsidianLinksInText(originalRaw)

    const { frontmatter, body } = splitFrontmatter(convertedRaw)
    const rel = path.relative(docsRoot, file).replace(/\\/g, '/')
    const route = `/${rel.replace(/\.md$/, '')}`

    const tags = parseTags(frontmatter, body)
    const title = parseTitle(frontmatter, body, path.basename(file))

    const relativeToRoot = path.relative(rootDir, file)
    const folderPath = path.dirname(relativeToRoot)
    const categorySegments = folderPath === '.' ? [] : folderPath.split(path.sep)
    const categories =
      categorySegments.length === 0
        ? ['Unclassified']
        : categorySegments.map((segment) => segment.replace(/[-_]/g, ' '))

    entries.push({ title, route, tags, categories, categorySegments })
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

function folderRoute(routeRoot, segments) {
  const encodedSegments = segments.map((segment) => encodeURIComponent(segment)).join('/')
  return encodedSegments ? `${routeRoot}/${encodedSegments}/` : `${routeRoot}/`
}

function markdownLinkTarget(link) {
  return link.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

function tagFolderRoute(segments) {
  const encodedSegments = segments.map((segment) => encodeURIComponent(segment)).join('/')
  return `/knowledge-base/_tags/${encodedSegments}/`
}

function makeSidebar(postsList, routeRoot) {
  const root = {}

  for (const post of postsList) {
    let categoryNode = root
    for (const [index, category] of post.categories.entries()) {
      if (!categoryNode[category]) {
        categoryNode[category] = {
          children: {},
          link: post.categorySegments.length
            ? folderRoute(routeRoot, post.categorySegments.slice(0, index + 1))
            : undefined
        }
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
          link: value.link,
          collapsed: true,
          items: [...directPosts.sort((a, b) => a.text.localeCompare(b.text)), ...nestedItems]
        })
    }

    return items.sort((a, b) => a.text.localeCompare(b.text))
  }

  return buildItems(root)
}

function makeTagSidebar(postsList) {
  const root = {}

  for (const post of postsList) {
    for (const tag of post.tags) {
      const segments = tag.split(/[\\/]/).filter(Boolean)
      if (!segments.length) continue

      let tagNode = root
        for (const [index, segment] of segments.entries()) {
          if (!tagNode[segment]) {
            tagNode[segment] = {
              children: {},
              link: tagFolderRoute(segments.slice(0, index + 1))
            }
          }
          tagNode = tagNode[segment].children
        }

      tagNode.__posts = tagNode.__posts || []
      tagNode.__posts.push({ text: post.title, link: post.route })
    }
  }

  return makeSidebarFromTree(root)
}

function makeSidebarFromTree(root) {
  function buildItems(treeNode) {
    const items = []

    for (const [name, value] of Object.entries(treeNode)) {
      if (name === '__posts') continue

      const nestedItems = buildItems(value.children)
      const directPosts = value.children.__posts || []

      items.push({
        text: name,
        link: value.link,
        collapsed: true,
        items: [...directPosts.sort((a, b) => a.text.localeCompare(b.text)), ...nestedItems]
      })
    }

    return items.sort((a, b) => a.text.localeCompare(b.text))
  }

  return buildItems(root)
}

const knowledgeBaseSidebar = makeSidebar(knowledgeBase, '/knowledge-base')
const knowledgeBaseTagSidebar = makeTagSidebar(knowledgeBase)
const posts = collectMarkdownEntries(postsRoot)
const postsSidebar = makeSidebar(posts, '/posts')

for (const [tag, list] of tagsMap.entries()) {
  list.sort((a, b) => a.title.localeCompare(b.title))
}

const allTags = [...tagsMap.keys()].sort((a, b) => a.localeCompare(b))

function writeIfGeneratedOrMissing(filePath, content) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8')
    if (!existing.startsWith(generatedListingMarker)) return
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function listDirectCategoryPosts(postsList, segments) {
  return postsList.filter((post) =>
    post.categorySegments.length === segments.length &&
    segments.every((segment, index) => post.categorySegments[index] === segment)
  )
}

function listDirectCategorySubfolders(postsList, segments) {
  const folders = new Set()

  for (const post of postsList) {
    if (!segments.every((segment, index) => post.categorySegments[index] === segment)) continue
    const nextSegment = post.categorySegments[segments.length]
    if (nextSegment) folders.add(nextSegment)
  }

  return [...folders].sort((a, b) => a.localeCompare(b))
}

function writeKnowledgeBaseFolderPages(postsList) {
  const folderKeys = new Set()

  for (const post of postsList) {
    for (let index = 1; index <= post.categorySegments.length; index += 1) {
      folderKeys.add(post.categorySegments.slice(0, index).join('/'))
    }
  }

  for (const key of folderKeys) {
    const segments = key.split('/').filter(Boolean)
    const title = segments.at(-1).replace(/[-_]/g, ' ')
    const subfolders = listDirectCategorySubfolders(postsList, segments)
    const posts = listDirectCategoryPosts(postsList, segments).sort((a, b) => a.title.localeCompare(b.title))
    const lines = [generatedListingMarker, `# ${title}`, '']

    if (subfolders.length) {
      lines.push('## Folders', '')
      for (const folder of subfolders) {
        lines.push(`- [${folder.replace(/[-_]/g, ' ')}](${markdownLinkTarget(`${folder}/`)})`)
      }
      lines.push('')
    }

    if (posts.length) {
      lines.push('## Notes', '')
      for (const post of posts) {
        lines.push(`- [${post.title}](${markdownLinkTarget(post.route)})`)
      }
      lines.push('')
    }

    writeIfGeneratedOrMissing(path.join(knowledgeBaseRoot, ...segments, 'index.md'), `${lines.join('\n')}\n`)
  }
}

function writeKnowledgeBaseIndex(postsList) {
  const subfolders = listDirectCategorySubfolders(postsList, [])
  const unclassifiedPosts = postsList
    .filter((post) => post.categorySegments.length === 0)
    .sort((a, b) => a.title.localeCompare(b.title))
  const lines = [
    generatedListingMarker,
    '# Knowledge Base',
    '',
    'Browse knowledge base notes from the left sidebar by folder or tag.',
    ''
  ]

  if (subfolders.length) {
    lines.push('## Folders', '')
    for (const folder of subfolders) {
      lines.push(`- [${folder.replace(/[-_]/g, ' ')}](${markdownLinkTarget(`${folder}/`)})`)
    }
    lines.push('')
  }

  if (unclassifiedPosts.length) {
    lines.push('## unclassified', '')
    for (const post of unclassifiedPosts) {
      lines.push(`- [${post.title}](${markdownLinkTarget(post.route)})`)
    }
    lines.push('')
  }

  fs.writeFileSync(path.join(knowledgeBaseRoot, 'index.md'), `${lines.join('\n')}\n`)
}

function tagSegments(tag) {
  return tag.split(/[\\/]/).filter(Boolean)
}

function listDirectTagSubfolders(tagsList, segments) {
  const folders = new Set()

  for (const tag of tagsList) {
    const segmentsForTag = tagSegments(tag)
    if (!segments.every((segment, index) => segmentsForTag[index] === segment)) continue
    const nextSegment = segmentsForTag[segments.length]
    if (nextSegment) folders.add(nextSegment)
  }

  return [...folders].sort((a, b) => a.localeCompare(b))
}

function listTagPosts(postsList, segments) {
  return postsList
    .filter((post) =>
      post.tags.some((tag) => {
        const segmentsForTag = tagSegments(tag)
        return segments.every((segment, index) => segmentsForTag[index] === segment)
      })
    )
    .sort((a, b) => a.title.localeCompare(b.title))
}

function writeKnowledgeBaseTagPages(postsList) {
  fs.rmSync(knowledgeBaseTagsRoot, { recursive: true, force: true })
  const tagKeys = new Set()

  for (const tag of allTags) {
    const segments = tagSegments(tag)
    for (let index = 1; index <= segments.length; index += 1) {
      tagKeys.add(segments.slice(0, index).join('/'))
    }
  }

  for (const key of tagKeys) {
    const segments = key.split('/').filter(Boolean)
    const subfolders = listDirectTagSubfolders(allTags, segments)
    const posts = listTagPosts(postsList, segments)
    const lines = [generatedListingMarker, `# #${segments.join('/')}`, '']

    if (subfolders.length) {
      lines.push('## Tags', '')
      for (const folder of subfolders) {
        lines.push(`- [#${segments.concat(folder).join('/')}](${markdownLinkTarget(`${folder}/`)})`)
      }
      lines.push('')
    }

    if (posts.length) {
      lines.push('## Notes', '')
      for (const post of posts) {
        lines.push(`- [${post.title}](${markdownLinkTarget(post.route)})`)
      }
      lines.push('')
    }

    const pagePath = path.join(knowledgeBaseTagsRoot, ...segments, 'index.md')
    fs.mkdirSync(path.dirname(pagePath), { recursive: true })
    fs.writeFileSync(pagePath, `${lines.join('\n')}\n`)
  }
}

function removeGeneratedTagPages() {
  fs.rmSync(tagsRoot, { recursive: true, force: true })
}

removeGeneratedTagPages()
writeKnowledgeBaseIndex(knowledgeBase)
writeKnowledgeBaseFolderPages(knowledgeBase)
writeKnowledgeBaseTagPages(knowledgeBase)

const moduleContent = `export const knowledgeBase = ${JSON.stringify(knowledgeBase, null, 2)}\n\nexport const knowledgeBaseSidebar = ${JSON.stringify(knowledgeBaseSidebar, null, 2)}\n\nexport const knowledgeBaseTagSidebar = ${JSON.stringify(knowledgeBaseTagSidebar, null, 2)}\n\nexport const posts = ${JSON.stringify(posts, null, 2)}\n\nexport const postsSidebar = ${JSON.stringify(postsSidebar, null, 2)}\n\nexport const tags = ${JSON.stringify(allTags, null, 2)}\n`

fs.writeFileSync(generatedModulePath, moduleContent)
