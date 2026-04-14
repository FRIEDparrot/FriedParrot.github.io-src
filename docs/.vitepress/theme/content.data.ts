import { createContentLoader } from 'vitepress'
import { extractTags, extractTitle } from './content-utils'

type LoadedPost = {
  title: string
  url: string
  sourcePath: string
  categoryPath: string[]
  tags: string[]
}

export default createContentLoader('posts/**/*.md', {
  includeSrc: true,
  transform(rawData): { posts: LoadedPost[]; tags: Record<string, LoadedPost[]> } {
    const posts = rawData
      .filter((entry) => !entry.url.endsWith('/index'))
      .map((entry) => {
        const sourcePath = entry.url.replace(/^\/posts\//, '')
        const segments = sourcePath.split('/')
        const filename = segments[segments.length - 1] ?? ''
        const title = extractTitle(entry.src || '', filename)
        const tags = extractTags(entry.src || '')

        return {
          title,
          url: entry.url,
          sourcePath,
          categoryPath: segments.length > 1 ? segments.slice(0, -1) : ['Unclassified'],
          tags
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title))

    const tags: Record<string, LoadedPost[]> = {}

    for (const post of posts) {
      for (const tag of post.tags) {
        const key = tag.toLowerCase()
        if (!tags[key]) {
          tags[key] = []
        }
        tags[key].push(post)
      }
    }

    Object.values(tags).forEach((items) => items.sort((a, b) => a.title.localeCompare(b.title)))

    return { posts, tags }
  }
})
