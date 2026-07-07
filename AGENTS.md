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

## Documentation & Comments

When adding or changing code, document functions whose behavior is not easy to infer from their name and local code. As a rule of thumb, add a short JSDoc or focused inline comments when a function has high cognitive complexity, roughly above 18, or when it coordinates parsing, path resolution, DOM navigation, markdown token rewriting, cross-file citation behavior, or other non-obvious control flow. Explain the intent, inputs, output shape, and important edge cases; avoid comments that merely restate individual lines.

## Testing Guidelines

Validate content and theme changes with `npm run docs:build` before committing. For visual or navigation changes, also run `npm run docs:dev` and check affected pages, sidebars, search behavior, Obsidian-style links, and generated tag routes. Do not manually edit generated outputs in `docs/.vitepress/dist/`, `docs/.vitepress/cache/`, or `docs/knowledge-base/_tags/`.

For Equation Citator interactions, distinguish citation elements from preview elements. Citation elements are inline spans with `.equation-citator-citation`; hovering them may change color and show a preview, but must never scroll, jump, push a hash, or open a tab. Preview elements are cloned target blocks inside `.equation-citator-preview` with `.equation-citator-preview-item`; only these preview elements handle navigation: double-click jumps in the current tab, and Ctrl/Cmd + double-click opens another tab.

## Commit & Pull Request Guidelines

Recent commit messages are short, imperative or past-tense summaries, for example `changed panel transparency` and `first blog post`. Keep commits focused on one content or site change. Pull requests should describe the affected pages or scripts, mention validation performed (`npm run docs:build`), link related issues when available, and include screenshots for visible layout or theme changes.

## Security & Configuration Tips

Do not commit local logs, secrets, or generated build artifacts. GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`; changes to build commands should stay aligned with that workflow.

## Equation Citator cross-file URL configuration

Cross-file citations resolve target file paths to URLs using mappings in `docs/.vitepress/theme/equationCitator.config.js`. The `pathMappings` array maps URL path patterns to base URL prefixes. When a citation references a target in another file, the citator checks the current browser URL against each entry's `urlPattern` and resolves the relative file path against the matching `baseUrl`.

To add cross-file resolution for a new section of the site (e.g., posts, projects), add an entry to `pathMappings` in that file.

## Equation Citator target IDs and navigation

Equation Citator does not use generated `id` attributes as the primary way to decide which equation, figure, or callout a citation references. The markdown plugin wraps targets with `.equation-citator-target` and writes semantic data attributes such as `data-ec-kind`, `data-ec-tag`, and `data-tag`. At runtime, `findMatchingTarget()` searches `.equation-citator-target[data-ec-kind]` elements and matches citation references by kind and tag. Equation tags are normalized so `eq:1.1` and `1.1` can match for equation targets.

The generated `id` attributes are still used after a target has been resolved. `assignStableTargetIds()`/`ensureTargetId()` assigns stable ids like `equation-citator-eq-1-1`, preserving a non-legacy existing id when present and adding a hashed fallback when duplicate targets would otherwise collide. Preview and jump navigation then call `buildPreviewUrl()`, put the resolved target id into the URL hash, and use `scrollToCurrentHash()` with `document.getElementById(...)` plus `scrollIntoView(...)` to move to that target. In short: `data-ec-kind` and tag attributes identify targets; `id` attributes provide stable hash links and scrolling once the target is known.

## Markdown source 

The markdown file to build the knowledge base and posts are provided in the `markdown/` folder. For most of the cases, including rendering issues and html tag issue. Not use the file searched under this folder, since it's not a built version. For the built one, you can often found under /docs. 



# In packages/equation citator 
