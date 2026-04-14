import fs from 'node:fs'
import path from 'node:path'

const EXCLUDED = new Set(['index.md'])

const cleanSegment = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const getFirstHeading = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const heading = source.match(/^#\s+(.+)$/m)?.[1]
  return heading?.trim()
}

const buildTree = (directory: string, prefix = '/posts/') => {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const dirs = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !EXCLUDED.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const fileItems = files.map((file) => {
    const slug = file.name.replace(/\.md$/, '')
    const filePath = path.join(directory, file.name)
    return {
      text: getFirstHeading(filePath) || cleanSegment(slug),
      link: `${prefix}${slug}`
    }
  })

  const dirItems = dirs.map((dir) => ({
    text: cleanSegment(dir.name),
    collapsed: true,
    items: buildTree(path.join(directory, dir.name), `${prefix}${dir.name}/`)
  }))

  return [...dirItems, ...fileItems]
}

export const createPostsSidebar = (postsRoot: string) => {
  const topLevel = fs.readdirSync(postsRoot, { withFileTypes: true })
  const unclassified = topLevel
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !EXCLUDED.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const slug = entry.name.replace(/\.md$/, '')
      const filePath = path.join(postsRoot, entry.name)
      return {
        text: getFirstHeading(filePath) || cleanSegment(slug),
        link: `/posts/${slug}`
      }
    })

  const nested = topLevel
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      text: cleanSegment(entry.name),
      collapsed: true,
      items: buildTree(path.join(postsRoot, entry.name), `/posts/${entry.name}/`)
    }))

  const items = [] as Array<Record<string, unknown>>
  if (unclassified.length) {
    items.push({
      text: 'Unclassified',
      collapsed: false,
      items: unclassified
    })
  }

  items.push(...nested)
  return items
}
