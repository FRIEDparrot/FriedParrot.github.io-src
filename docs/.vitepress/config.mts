import { defineConfig } from 'vitepress'

function convertObsidianLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
    const [targetRaw, aliasRaw] = raw.split('|')
    const target = (targetRaw || '').trim()
    const alias = (aliasRaw || '').trim()
    if (!target) {
      return _
    }

    const normalized = target
      .replace(/\\/g, '/')
      .replace(/\.md$/i, '')
      .split('/')
      .map((segment) => segment.trim().replace(/\s+/g, '-'))
      .join('/')

    const href = normalized.startsWith('/') ? normalized : `/${normalized}`
    const label = alias || target.split('/').at(-1) || target

    return `[${label}](${href})`
  })
}

export default defineConfig({
  title: 'FriedParrot',
  description: 'Minimalist personal blog and knowledge base',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  markdown: {
    config(md) {
      const originalRender = md.render.bind(md)
      md.render = (src, env) => originalRender(convertObsidianLinks(src), env)
    }
  },
  vite: {
    plugins: [
      {
        name: 'obsidian-wikilink-transform',
        enforce: 'pre',
        transform(code, id) {
          if (!id.endsWith('.md')) {
            return null
          }
          return convertObsidianLinks(code)
        }
      }
    ]
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Posts', link: '/posts/' },
      { text: 'Projects', link: '/projects' },
      { text: 'About Me', link: '/about' }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/FRIEDparrot' }],
    featuredProject: {
      name: 'FriedParrot.github.io',
      description: 'A minimalist VitePress-powered personal blog and knowledge base.',
      link: 'https://github.com/FRIEDparrot/FriedParrot.github.io'
    }
  }
})
