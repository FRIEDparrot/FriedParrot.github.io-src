import { defineConfig } from 'vitepress'
import { sidebar } from './generated/content-data.mjs'
import { convertObsidianLinksInText } from '../../scripts/content-utils.mjs'

export default defineConfig({
  title: 'FriedParrot',
  description: 'Personal blog and project knowledge base',
  lastUpdated: true,
  base: '/',
  lang: 'en-US',
  appearance: true,
  themeConfig: {
    nav: [
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
      '/posts/': sidebar
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/FRIEDparrot' }]
  },
  markdown: {
    lineNumbers: true,
    config(md) {
      md.core.ruler.before('normalize', 'obsidian-links', (state) => {
        state.src = convertObsidianLinksInText(state.src)
      })
    }
  }
})
