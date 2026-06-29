# FriedParrot.github.io

Personal site powered by VitePress and deployed to GitHub Pages.

## Local development

```bash
npm install
npm run docs:dev
```

## Build

```bash
npm run docs:build
```

`docs:dev` and `docs:build` run `prepare:content` first. That step rebuilds the generated content index, sidebars, and tag pages from markdown under `docs/knowledge-base`.
