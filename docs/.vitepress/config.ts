import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { createPostsSidebar } from './theme/sidebar'
import { normalizeWikiLinks } from './theme/content-utils'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const postsRoot = path.resolve(dirname, '../posts')

export default defineConfig({
  title: 'FriedParrot',
  description: 'Minimalist blog and project notes by FriedParrot.',
  lang: 'en-US',
  cleanUrls: true,
  appearance: 'dark',
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'FriedParrot',
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Posts', link: '/posts/' },
      { text: 'Projects', link: '/projects/' },
      { text: 'About Me', link: '/about/' }
    ],
    sidebar: {
      '/posts/': createPostsSidebar(postsRoot)
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/FRIEDparrot' }]
  },
  markdown: {
    config: (md) => {
      md.core.ruler.before('normalize', 'obsidian-wikilink-preprocess', (state) => {
        state.src = normalizeWikiLinks(state.src)
      })
    }
  }
})
