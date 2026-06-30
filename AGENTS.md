# Repository Guidelines

## Project Structure & Module Organization

This repository is a VitePress personal site. Author-facing pages live in `docs/`, including top-level pages such as `docs/index.md`, posts in `docs/posts/`, project pages in `docs/projects/`, and notes in `docs/knowledge-base/`. VitePress configuration, theme code, Vue components, and generated data are under `docs/.vitepress/`. Shared build scripts live in `scripts/`; `scripts/prepare-content.mjs` rebuilds sidebars, knowledge-base listings, and tag pages. Static public files belong in `docs/public/`; source image assets are also kept in `assets/` and `docs/knowledge-base/assets/`.

## Build, Test, and Development Commands

- `npm install` or `npm ci`: install dependencies. CI uses Node 20 and `npm ci`.
- `npm run prepare:content`: regenerate content metadata, sidebars, folder indexes, and knowledge-base tag pages.
- `npm run docs:dev`: run `prepare:content`, then start the local VitePress dev server.
- `npm run docs:build`: run `prepare:content`, then build the static site into `docs/.vitepress/dist/`.
- `npm run docs:preview`: preview the most recent production build locally.

There is no dedicated test command; use `npm run docs:build` as the primary validation step.

## Coding Style & Naming Conventions

Use ES modules for JavaScript and Vue-related files, matching the existing `.mjs` and `.js` files. Keep indentation at two spaces in JavaScript, Vue, JSON, and Markdown examples. Prefer descriptive kebab-case filenames for Markdown routes, such as `docs/projects/fish-segmentation.md`; preserve existing filenames when editing current pages. Use frontmatter `tags` for knowledge-base classification, either as an inline array or YAML list.

## Testing Guidelines

Validate content and theme changes with `npm run docs:build` before committing. For visual or navigation changes, also run `npm run docs:dev` and check affected pages, sidebars, search behavior, Obsidian-style links, and generated tag routes. Do not manually edit generated outputs in `docs/.vitepress/dist/`, `docs/.vitepress/cache/`, or `docs/knowledge-base/_tags/`.

## Commit & Pull Request Guidelines

Recent commit messages are short, imperative or past-tense summaries, for example `changed panel transparency` and `first blog post`. Keep commits focused on one content or site change. Pull requests should describe the affected pages or scripts, mention validation performed (`npm run docs:build`), link related issues when available, and include screenshots for visible layout or theme changes.

## Security & Configuration Tips

Do not commit local logs, secrets, or generated build artifacts. GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`; changes to build commands should stay aligned with that workflow.
