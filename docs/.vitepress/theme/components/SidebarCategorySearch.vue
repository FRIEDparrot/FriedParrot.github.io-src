<script setup>
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { knowledgeBaseSidebar, knowledgeBaseTagSidebar } from '../../generated/content-data.mjs'

const sidebarWidthStorageKey = 'knowledge-sidebar-width'
const defaultSidebarWidth = 296
const minSidebarWidth = 220
const maxSidebarWidth = 440

const route = useRoute()
const activeMode = ref('classified')
const query = ref('')
const openKeys = ref(new Set())
const isResizing = ref(false)
let activePointerId = null

const isKnowledgeBase = computed(() => route.path.startsWith('/knowledge-base/'))
const activeTree = computed(() => activeMode.value === 'tags' ? knowledgeBaseTagSidebar : knowledgeBaseSidebar)
const modeLabel = computed(() => activeMode.value === 'tags' ? 'tags' : 'classified folders')
const placeholder = computed(() => activeMode.value === 'tags' ? 'Search tags...' : 'Search folders...')
const visibleTree = computed(() => visibleItems(activeTree.value))

function normalize(text) {
  return text.trim().toLowerCase()
}

function itemKey(item, parentKey = '') {
  return `${parentKey}/${item.text}`
}

function isActive(link) {
  return Boolean(link && route.path === link)
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

function hasActiveDescendant(item) {
  return Boolean(item.items?.some((child) => isActive(child.link) || hasActiveDescendant(child)))
}

function isOpen(item, key) {
  return Boolean(query.value || openKeys.value.has(key) || hasActiveDescendant(item))
}

function toggleItem(key) {
  const next = new Set(openKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openKeys.value = next
}

function setMode(mode) {
  activeMode.value = mode
  query.value = ''
  openKeys.value = new Set()
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
  document.body.classList.remove('knowledge-sidebar-resizing')
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
  document.body.classList.add('knowledge-sidebar-resizing')
  event.currentTarget.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', handleResizeMove)
  window.addEventListener('pointerup', finishResizing)
  window.addEventListener('pointercancel', finishResizing)
}

function renderTree(items, parentKey = '') {
  return h('ul', { class: 'knowledge-sidebar__list' }, visibleItems(items).map((item) => {
    const key = itemKey(item, parentKey)
    const hasChildren = Boolean(item.items?.length)

    const content = hasChildren
      ? [
          h('div', {
            class: 'knowledge-sidebar__folder',
            'aria-expanded': isOpen(item, key)
          }, [
            h('button', {
              type: 'button',
              class: 'knowledge-sidebar__toggle',
              'aria-label': `${isOpen(item, key) ? 'Collapse' : 'Expand'} ${item.text}`,
              onClick: () => toggleItem(key)
            }),
            item.link
              ? h('a', {
                  class: ['knowledge-sidebar__folder-link', { active: isActive(item.link) }],
                  href: item.link
                }, item.text)
              : h('button', {
                  type: 'button',
                  class: 'knowledge-sidebar__folder-link',
                  onClick: () => toggleItem(key)
                }, item.text)
          ]),
          isOpen(item, key) ? renderTree(item.items, key) : null
        ]
      : [
          h('a', {
            class: ['knowledge-sidebar__link', { active: isActive(item.link) }],
            href: item.link
          }, item.text)
        ]

    return h('li', {
      key,
      class: ['knowledge-sidebar__item', { 'has-children': hasChildren }]
    }, content)
  }))
}

onMounted(() => {
  applySidebarWidth(loadSidebarWidth())
})

onBeforeUnmount(() => {
  finishResizing()
})

watch(isKnowledgeBase, (active) => {
  if (active) applySidebarWidth(loadSidebarWidth())
  else finishResizing()
})
</script>

<template>
  <div v-if="isKnowledgeBase" class="knowledge-sidebar">
    <div class="knowledge-sidebar__switch" aria-label="Knowledge base sidebar mode">
      <button
        type="button"
        :class="{ active: activeMode === 'classified' }"
        @click="setMode('classified')"
      >
        Classified
      </button>
      <button
        type="button"
        :class="{ active: activeMode === 'tags' }"
        @click="setMode('tags')"
      >
        Tags
      </button>
    </div>

    <input
      v-model="query"
      class="knowledge-sidebar__search"
      type="search"
      :placeholder="placeholder"
      autocomplete="off"
      :aria-label="`Search ${modeLabel}`"
    />

    <nav class="knowledge-sidebar__tree" :aria-label="`Knowledge base ${modeLabel}`">
      <component :is="renderTree(visibleTree)" />
      <p v-if="query && !visibleTree.length" class="knowledge-sidebar__empty">
        No matching {{ modeLabel }}.
      </p>
    </nav>
  </div>
  <button
    v-if="isKnowledgeBase"
    type="button"
    class="knowledge-sidebar-resizer"
    :class="{ active: isResizing }"
    aria-label="Resize knowledge base sidebar"
    title="Resize sidebar"
    @pointerdown.prevent="startResizing"
    @dblclick="applySidebarWidth(defaultSidebarWidth)"
  />
</template>

<style>
.VPSidebar:has(.knowledge-sidebar) .nav > .group {
  display: none;
}

.VPSidebar:has(.knowledge-sidebar) .curtain {
  display: none;
}

.knowledge-sidebar-resizing {
  cursor: col-resize;
  user-select: none;
}

.knowledge-sidebar-resizing * {
  cursor: col-resize !important;
}

.knowledge-sidebar__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.knowledge-sidebar__list .knowledge-sidebar__list {
  margin: 3px 0 3px 12px;
  padding-left: 10px;
  border-left: 1px solid var(--vp-c-divider);
}

.knowledge-sidebar__item + .knowledge-sidebar__item {
  margin-top: 2px;
}

.knowledge-sidebar__link {
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

.knowledge-sidebar__folder {
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border-radius: 5px;
  color: var(--vp-c-text-2);
}

.knowledge-sidebar__toggle {
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

.knowledge-sidebar__folder[aria-expanded='true'] .knowledge-sidebar__toggle {
  transform: rotate(45deg) translateY(-1px);
}

.knowledge-sidebar__folder-link {
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

.knowledge-sidebar__folder:hover,
.knowledge-sidebar__folder:has(.knowledge-sidebar__folder-link.active),
.knowledge-sidebar__link:hover,
.knowledge-sidebar__link.active {
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  text-decoration: none;
}

.knowledge-sidebar__folder-link.active,
.knowledge-sidebar__link.active {
  font-weight: 700;
}

@media (min-width: 960px) {
  .VPSidebar:has(.knowledge-sidebar) {
    overflow: visible;
  }

  .VPSidebar:has(.knowledge-sidebar) .nav {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>

<style scoped>
.knowledge-sidebar {
  margin: 0;
}

.knowledge-sidebar__switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px;
  background: var(--vp-c-bg-soft);
}

.knowledge-sidebar__switch button {
  min-height: 28px;
  border: 0;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.knowledge-sidebar__switch button.active {
  color: #ffffff;
  background: var(--vp-c-brand-1);
}

.knowledge-sidebar__search {
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 9px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.knowledge-sidebar__search:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.knowledge-sidebar__tree {
  margin-top: 12px;
}

.knowledge-sidebar__empty {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.knowledge-sidebar-resizer {
  display: none;
}

@media (min-width: 960px) {
  .knowledge-sidebar-resizer {
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

  .knowledge-sidebar-resizer::before {
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

  .knowledge-sidebar-resizer:hover::before,
  .knowledge-sidebar-resizer:focus-visible::before,
  .knowledge-sidebar-resizer.active::before {
    background: var(--vp-c-brand-1);
    opacity: 1;
  }

  .knowledge-sidebar-resizer:focus-visible {
    outline: none;
  }
}

@media (min-width: 1440px) {
  .knowledge-sidebar-resizer {
    left: calc((100vw - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width));
  }
}
</style>
