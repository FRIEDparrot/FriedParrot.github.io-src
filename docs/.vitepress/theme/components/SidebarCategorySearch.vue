<script setup>
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import {
  knowledgeBase,
  knowledgeBaseSidebar,
  knowledgeBaseTagSidebar,
  posts,
  postsSidebar,
  postsTagSidebar
} from '../../generated/content-data.mjs'

const sidebarWidthStorageKey = 'content-sidebar-width'
const defaultSidebarWidth = 296
const minSidebarWidth = 220
const maxSidebarWidth = 440
const locateHighlightMs = 1400

const route = useRoute()
const activeMode = ref('classified')
const query = ref('')
const openKeys = ref(new Set())
const isResizing = ref(false)
const locatedLink = ref('')
let activePointerId = null
let locateHighlightTimeout = null

const isKnowledgeBase = computed(() => route.path.startsWith('/knowledge-base/'))
const isPosts = computed(() => route.path.startsWith('/posts/'))
const isContentSidebar = computed(() => isKnowledgeBase.value || isPosts.value)
const sectionLabel = computed(() => isPosts.value ? 'posts' : 'knowledge base')
const folderTree = computed(() => isPosts.value ? postsSidebar : knowledgeBaseSidebar)
const tagTree = computed(() => isPosts.value ? postsTagSidebar : knowledgeBaseTagSidebar)
const canUseTags = computed(() => Boolean(tagTree.value.length))
const activeTree = computed(() => activeMode.value === 'tags' ? tagTree.value : folderTree.value)
const modeLabel = computed(() => activeMode.value === 'tags' ? 'tags' : 'classified folders')
const placeholder = computed(() => activeMode.value === 'tags' ? 'Search tags...' : 'Search folders...')
const visibleTree = computed(() => visibleItems(activeTree.value))
const currentRoutePath = computed(() => normalizeRoutePath(route.path))
const fileRoutes = computed(() => new Set((isPosts.value ? posts : knowledgeBase).map((item) => normalizeRoutePath(item.route))))
const currentFilePath = computed(() => fileRoutes.value.has(currentRoutePath.value) ? currentRoutePath.value : '')
const canLocateCurrentFile = computed(() => Boolean(currentFilePath.value && findItemPath(activeTree.value, currentFilePath.value)))

function normalize(text) {
  return text.trim().toLowerCase()
}

function normalizeRoutePath(path) {
  const rawPath = String(path || '').split(/[?#]/)[0]
  let normalized = rawPath

  try {
    normalized = decodeURI(normalized)
  } catch {
    normalized = rawPath
  }

  normalized = normalized
    .replace(/\.html$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '')

  return normalized || '/'
}

function itemKey(item, parentKey = '') {
  return `${parentKey}/${item.text}`
}

function isActive(link) {
  return Boolean(link && currentRoutePath.value === normalizeRoutePath(link))
}

function isLocated(link) {
  return Boolean(link && locatedLink.value === normalizeRoutePath(link))
}

function itemMatches(item, normalizedQuery) {
  if (!normalizedQuery) return true
  if (normalize(item.text).includes(normalizedQuery)) return true
  return Boolean(item.items?.some((child) => itemMatches(child, normalizedQuery)))
}

function visibleItems(items) {
  const normalizedQuery = normalize(query.value)
  if (!normalizedQuery) return items
  return items.filter((item) => itemMatches(item, normalizedQuery))
}

function isOpen(item, key) {
  return Boolean(query.value || openKeys.value.has(key))
}

function toggleItem(key) {
  const next = new Set(openKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openKeys.value = next
}

function setMode(mode) {
  if (mode === 'tags' && !canUseTags.value) return

  activeMode.value = mode
  query.value = ''
  openKeys.value = new Set()
}

function clearLocateHighlight() {
  if (locateHighlightTimeout) {
    window.clearTimeout(locateHighlightTimeout)
    locateHighlightTimeout = null
  }

  locatedLink.value = ''
}

function findItemPath(items, targetLink, parentKey = '', ancestors = []) {
  for (const item of items) {
    const key = itemKey(item, parentKey)

    if (item.link && normalizeRoutePath(item.link) === targetLink) {
      return { item, key, ancestors }
    }

    if (item.items?.length) {
      const match = findItemPath(item.items, targetLink, key, [...ancestors, key])
      if (match) return match
    }
  }

  return null
}

function openCurrentFileAncestors() {
  if (!currentFilePath.value) return

  const match = findItemPath(activeTree.value, currentFilePath.value)
  if (!match) return

  openKeys.value = new Set(match.ancestors)
}

async function locateCurrentFile() {
  const match = findItemPath(activeTree.value, currentFilePath.value)
  if (!match) return

  query.value = ''
  openKeys.value = new Set(match.ancestors)
  locatedLink.value = normalizeRoutePath(match.item.link)

  await nextTick()

  const target = document.querySelector(`[data-sidebar-link="${CSS.escape(locatedLink.value)}"]`)
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })

  if (locateHighlightTimeout) window.clearTimeout(locateHighlightTimeout)
  locateHighlightTimeout = window.setTimeout(() => {
    locatedLink.value = ''
    locateHighlightTimeout = null
  }, locateHighlightMs)
}

function clampSidebarWidth(width) {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, Math.round(width)))
}

function applySidebarWidth(width) {
  if (typeof document === 'undefined') return

  const nextWidth = clampSidebarWidth(width)
  document.documentElement.style.setProperty('--vp-sidebar-width', `${nextWidth}px`)
  localStorage.setItem(sidebarWidthStorageKey, String(nextWidth))
}

function loadSidebarWidth() {
  if (typeof localStorage === 'undefined') return defaultSidebarWidth

  const storedWidth = Number(localStorage.getItem(sidebarWidthStorageKey))
  return Number.isFinite(storedWidth) ? storedWidth : defaultSidebarWidth
}

function sidebarStartOffset() {
  const layoutMaxWidth = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-layout-max-width'))
  if (!Number.isFinite(layoutMaxWidth) || window.innerWidth < 1440) return 0

  return Math.max(0, (window.innerWidth - layoutMaxWidth) / 2)
}

function finishResizing() {
  if (!isResizing.value) return

  isResizing.value = false
  activePointerId = null
  document.body.classList.remove('content-sidebar-resizing')
  window.removeEventListener('pointermove', handleResizeMove)
  window.removeEventListener('pointerup', finishResizing)
  window.removeEventListener('pointercancel', finishResizing)
}

function handleResizeMove(event) {
  if (activePointerId !== null && event.pointerId !== activePointerId) return

  applySidebarWidth(event.clientX - sidebarStartOffset())
}

function startResizing(event) {
  if (window.matchMedia('(max-width: 959px)').matches) return

  activePointerId = event.pointerId
  isResizing.value = true
  document.body.classList.add('content-sidebar-resizing')
  event.currentTarget.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', handleResizeMove)
  window.addEventListener('pointerup', finishResizing)
  window.addEventListener('pointercancel', finishResizing)
}

function linkedItemAttrs(item, className) {
  return {
    class: [
      className,
      {
        active: isActive(item.link),
        located: isLocated(item.link)
      }
    ],
    href: item.link,
    'data-sidebar-link': normalizeRoutePath(item.link)
  }
}

function renderTree(items, parentKey = '') {
  return h('ul', { class: 'content-sidebar__list' }, visibleItems(items).map((item) => {
    const key = itemKey(item, parentKey)
    const hasChildren = Boolean(item.items?.length)

    const content = hasChildren
      ? [
          h('div', {
            class: 'content-sidebar__folder',
            'aria-expanded': isOpen(item, key)
          }, [
            h('button', {
              type: 'button',
              class: 'content-sidebar__toggle',
              'aria-label': `${isOpen(item, key) ? 'Collapse' : 'Expand'} ${item.text}`,
              onClick: () => toggleItem(key)
            }),
            item.link
              ? h('a', linkedItemAttrs(item, 'content-sidebar__folder-link'), item.text)
              : h('button', {
                  type: 'button',
                  class: 'content-sidebar__folder-link',
                  onClick: () => toggleItem(key)
                }, item.text)
          ]),
          isOpen(item, key) ? renderTree(item.items, key) : null
        ]
      : [
          h('a', linkedItemAttrs(item, 'content-sidebar__link'), item.text)
        ]

    return h('li', {
      key,
      class: ['content-sidebar__item', { 'has-children': hasChildren }]
    }, content)
  }))
}

onMounted(() => {
  applySidebarWidth(loadSidebarWidth())
})

onBeforeUnmount(() => {
  finishResizing()
  clearLocateHighlight()
})

watch(isContentSidebar, (active) => {
  if (active) applySidebarWidth(loadSidebarWidth())
  else finishResizing()
})

watch(() => route.path, () => {
  clearLocateHighlight()
  openCurrentFileAncestors()
})

watch(canUseTags, (enabled) => {
  if (!enabled && activeMode.value === 'tags') setMode('classified')
})

watch(activeTree, () => {
  openCurrentFileAncestors()
}, { immediate: true })
</script>

<template>
  <div v-if="isContentSidebar" class="content-sidebar">
    <div class="content-sidebar__switch" :aria-label="`${sectionLabel} sidebar mode`">
      <button
        type="button"
        :class="{ active: activeMode === 'classified' }"
        @click="setMode('classified')"
      >
        Classified
      </button>
      <button
        type="button"
        :disabled="!canUseTags"
        :class="{ active: activeMode === 'tags' }"
        @click="setMode('tags')"
      >
        Tags
      </button>
    </div>

    <div class="content-sidebar__search-row">
      <input
        v-model="query"
        class="content-sidebar__search"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        :aria-label="`Search ${modeLabel}`"
      />
      <button
        type="button"
        class="content-sidebar__locate"
        :disabled="!canLocateCurrentFile"
        :aria-label="`Locate current file in ${modeLabel}`"
        :title="`Locate current file in ${modeLabel}`"
        @click="locateCurrentFile"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </button>
    </div>

    <nav class="content-sidebar__tree" :aria-label="`${sectionLabel} ${modeLabel}`">
      <component :is="renderTree(visibleTree)" />
      <p v-if="query && !visibleTree.length" class="content-sidebar__empty">
        No matching {{ modeLabel }}.
      </p>
    </nav>
  </div>
  <button
    v-if="isContentSidebar"
    type="button"
    class="content-sidebar-resizer"
    :class="{ active: isResizing }"
    :aria-label="`Resize ${sectionLabel} sidebar`"
    title="Resize sidebar"
    @pointerdown.prevent="startResizing"
    @dblclick="applySidebarWidth(defaultSidebarWidth)"
  />
</template>

<style>
.VPSidebar:has(.content-sidebar) .nav > .group {
  display: none;
}

.VPSidebar:has(.content-sidebar) .curtain {
  display: none;
}

.content-sidebar-resizing {
  cursor: col-resize;
  user-select: none;
}

.content-sidebar-resizing * {
  cursor: col-resize !important;
}

.content-sidebar__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.content-sidebar__list .content-sidebar__list {
  margin: 3px 0 3px 12px;
  padding-left: 10px;
  border-left: 1px solid var(--vp-c-divider);
}

.content-sidebar__item + .content-sidebar__item {
  margin-top: 2px;
}

.content-sidebar__link {
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  border: 0;
  border-radius: 5px;
  padding: 4px 8px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 13px;
  line-height: 1.35;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.content-sidebar__folder {
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border-radius: 5px;
  color: var(--vp-c-text-2);
}

.content-sidebar__toggle {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-left: 7px;
  margin-right: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-top: 0;
  border-left: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  transform: rotate(-45deg);
  transition: transform 0.16s ease;
}

.content-sidebar__folder[aria-expanded='true'] .content-sidebar__toggle {
  transform: rotate(45deg) translateY(-1px);
}

.content-sidebar__folder-link {
  flex: 1;
  min-width: 0;
  border: 0;
  border-radius: 5px;
  padding: 4px 8px 4px 0;
  color: inherit;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.content-sidebar__folder:hover,
.content-sidebar__folder:has(.content-sidebar__folder-link.active),
.content-sidebar__folder:has(.content-sidebar__folder-link.located),
.content-sidebar__link:hover,
.content-sidebar__link.active,
.content-sidebar__link.located {
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  text-decoration: none;
}

.content-sidebar__folder-link.active,
.content-sidebar__folder-link.located,
.content-sidebar__link.active,
.content-sidebar__link.located {
  font-weight: 700;
}

.content-sidebar__folder-link.located,
.content-sidebar__link.located {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vp-c-brand-1) 42%, transparent);
}

@media (min-width: 960px) {
  .VPSidebar:has(.content-sidebar) {
    overflow: visible;
  }

  .VPSidebar:has(.content-sidebar) .nav {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>

<style scoped>
.content-sidebar {
  margin: 0;
}

.content-sidebar__switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px;
  background: var(--vp-c-bg-soft);
}

.content-sidebar__switch button {
  min-height: 28px;
  border: 0;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.content-sidebar__switch button.active {
  color: #ffffff;
  background: var(--vp-c-brand-1);
}

.content-sidebar__switch button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.content-sidebar__search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  gap: 6px;
  align-items: center;
}

.content-sidebar__search {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 9px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.content-sidebar__search:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.content-sidebar__locate {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
}

.content-sidebar__locate:hover:not(:disabled),
.content-sidebar__locate:focus-visible {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.content-sidebar__locate:focus-visible {
  outline: none;
}

.content-sidebar__locate:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.content-sidebar__locate svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.content-sidebar__tree {
  margin-top: 12px;
}

.content-sidebar__empty {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.content-sidebar-resizer {
  display: none;
}

@media (min-width: 960px) {
  .content-sidebar-resizer {
    position: fixed;
    z-index: calc(var(--vp-z-index-sidebar) + 1);
    top: var(--vp-nav-height);
    bottom: 0;
    left: var(--vp-sidebar-width);
    display: block;
    width: 10px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: col-resize;
    transform: translateX(-50%);
  }

  .content-sidebar-resizer::before {
    position: absolute;
    top: 0;
    left: 50%;
    bottom: 0;
    width: 1px;
    background: var(--vp-c-divider);
    content: "";
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.16s ease, background-color 0.16s ease;
  }

  .content-sidebar-resizer:hover::before,
  .content-sidebar-resizer:focus-visible::before,
  .content-sidebar-resizer.active::before {
    background: var(--vp-c-brand-1);
    opacity: 1;
  }

  .content-sidebar-resizer:focus-visible {
    outline: none;
  }
}

@media (min-width: 1440px) {
  .content-sidebar-resizer {
    left: calc((100vw - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width));
  }
}
</style>
