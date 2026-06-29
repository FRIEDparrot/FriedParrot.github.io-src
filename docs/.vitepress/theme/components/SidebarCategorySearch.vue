<script setup>
import { computed, h, ref } from 'vue'
import { useRoute } from 'vitepress'
import { knowledgeBaseSidebar, knowledgeBaseTagSidebar } from '../../generated/content-data.mjs'

const route = useRoute()
const activeMode = ref('classified')
const query = ref('')
const openKeys = ref(new Set())

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
</template>

<style>
.VPSidebar:has(.knowledge-sidebar) .nav > .group {
  display: none;
}

.VPSidebar:has(.knowledge-sidebar) .curtain {
  display: none;
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
  width: 6px;
  height: 6px;
  margin-left: 8px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
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
</style>

<style scoped>
.knowledge-sidebar {
  margin: 8px 12px 14px;
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
</style>
