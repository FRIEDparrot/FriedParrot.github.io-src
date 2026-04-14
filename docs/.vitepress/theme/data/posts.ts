export interface PostItem {
  title: string
  url: string
  categoryPath: string[]
  tags: string[]
  date?: string
  excerpt?: string
}

export interface CategoryNode {
  name: string
  path: string
  children: CategoryNode[]
  posts: PostItem[]
}

export interface PostData {
  posts: PostItem[]
  categoryTree: CategoryNode[]
  tags: Record<string, PostItem[]>
}

function toTitle(input: string): string {
  return input
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseFrontmatter(source: string): { frontmatter: Record<string, unknown>; body: string } {
  if (!source.startsWith('---\n')) {
    return { frontmatter: {}, body: source }
  }

  const endMarker = source.indexOf('\n---\n', 4)
  if (endMarker === -1) {
    return { frontmatter: {}, body: source }
  }

  const block = source.slice(4, endMarker)
  const body = source.slice(endMarker + 5)
  const frontmatter: Record<string, unknown> = {}

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const [keyRaw, ...rest] = line.split(':')
    if (!keyRaw || !rest.length) {
      continue
    }

    const key = keyRaw.trim()
    const value = rest.join(':').trim()

    if (key === 'tags') {
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter.tags = value
          .slice(1, -1)
          .split(',')
          .map((tag) => tag.trim().replace(/^['"]|['"]$/g, '').replace(/^#/, '').toLowerCase())
          .filter(Boolean)
      } else {
        frontmatter.tags = value
          .split(',')
          .map((tag) => tag.trim().replace(/^['"]|['"]$/g, '').replace(/^#/, '').toLowerCase())
          .filter(Boolean)
      }
      continue
    }

    frontmatter[key] = value.replace(/^['"]|['"]$/g, '')
  }

  return { frontmatter, body }
}

function extractTags(frontmatterTags: unknown, src = ''): string[] {
  const fromFrontmatter = Array.isArray(frontmatterTags)
    ? frontmatterTags
        .map((tag) => String(tag).trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean)
    : typeof frontmatterTags === 'string'
      ? frontmatterTags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
          .filter(Boolean)
      : []

  const hashtagMatches = Array.from(src.matchAll(/(^|[^\w`])#([a-zA-Z0-9_-]+)/g)).map(([, , tag]) =>
    tag.toLowerCase()
  )

  return Array.from(new Set([...fromFrontmatter, ...hashtagMatches])).sort()
}

function ensureNode(root: CategoryNode[], pathParts: string[]): CategoryNode {
  let currentList = root
  let currentPath = ''
  let currentNode: CategoryNode | null = null

  for (const part of pathParts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part
    let node = currentList.find((item) => item.name === part)
    if (!node) {
      node = { name: part, path: currentPath, children: [], posts: [] }
      currentList.push(node)
      currentList.sort((a, b) => a.name.localeCompare(b.name))
    }
    currentNode = node
    currentList = node.children
  }

  if (!currentNode) {
    throw new Error('Category path must contain at least one segment')
  }

  return currentNode
}

const markdownFiles = import.meta.glob('../../../posts/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>

const posts: PostItem[] = Object.entries(markdownFiles)
  .map(([fullPath, source]) => {
    const relative = fullPath.replace(/^\.\.\/\.\.\/\.\.\/posts\//, '').replace(/^\/home\/runner\/work\/FriedParrot\.github\.io\/FriedParrot\.github\.io\/docs\/posts\//, '').replace(/\.md$/, '')
    if (relative === 'index') {
      return null
    }

    const { frontmatter, body } = parseFrontmatter(source)
    const segments = relative.split('/').filter(Boolean)
    const slug = segments.at(-1) || 'post'
    const categoryPath = segments.slice(0, -1)

    const excerpt = body
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'))

    return {
      title: typeof frontmatter.title === 'string' ? frontmatter.title : toTitle(slug),
      url: `/posts/${relative}`,
      date: typeof frontmatter.date === 'string' ? frontmatter.date : undefined,
      excerpt,
      categoryPath: categoryPath.length ? categoryPath.map(toTitle) : ['Unclassified'],
      tags: extractTags(frontmatter.tags, body)
    } satisfies PostItem
  })
  .filter((post): post is PostItem => Boolean(post))
  .sort((a, b) => a.title.localeCompare(b.title))

const categoryTree: CategoryNode[] = []
const tagMap: Record<string, PostItem[]> = {}

for (const post of posts) {
  const node = ensureNode(categoryTree, post.categoryPath)
  node.posts.push(post)

  for (const tag of post.tags) {
    if (!tagMap[tag]) {
      tagMap[tag] = []
    }
    tagMap[tag].push(post)
  }
}

for (const tag of Object.keys(tagMap)) {
  tagMap[tag].sort((a, b) => a.title.localeCompare(b.title))
}

export const postsData: PostData = {
  posts,
  categoryTree,
  tags: Object.fromEntries(Object.entries(tagMap).sort(([a], [b]) => a.localeCompare(b)))
}
