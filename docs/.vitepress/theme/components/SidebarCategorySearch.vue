<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const OBSERVER_DEBOUNCE_DELAY_MS = 50

const route = useRoute()
const query = ref('')
const visibleCount = ref(0)
let sidebarMutationObserver
let observerDebounceTimer

function normalize(text) {
  return text.trim().toLowerCase()
}

function getSidebarItemLabel(item) {
  return normalize(item.querySelector(':scope > .item > .text')?.textContent || '')
}

function getSubcategoryItems(item) {
  return Array.from(item.querySelectorAll('.VPSidebarItem')).filter(
    (nestedItem) => nestedItem !== item && nestedItem.querySelector(':scope > .items')
  )
}

function expandToItem(item, rootItem) {
  let current = item

  while (current && current !== rootItem.parentElement) {
    if (current.classList.contains('collapsible') && current.classList.contains('collapsed')) {
      current.querySelector(':scope > .item > .caret')?.click()
    }

    current = current.parentElement?.closest('.VPSidebarItem')
  }
}

function getCategoryItems() {
  const sidebar = document.querySelector('.VPSidebar')
  if (!sidebar) return []

  // Depends on VitePress internal sidebar DOM class names, which may change in future versions.
  // Tested with VitePress v1.6.4.
  // If VitePress updates sidebar markup, this selector logic may need to be updated.
  return Array.from(sidebar.querySelectorAll('.VPSidebarItem.level-0')).filter((item) =>
    item.querySelector('.items')
  )
}

function applyFilter() {
  const items = getCategoryItems()
  if (!items.length) {
    visibleCount.value = 0
    return
  }

  const normalizedQuery = normalize(query.value)
  let visibleCategoryCount = 0

  items.forEach((item) => {
    const categoryLabel = getSidebarItemLabel(item)
    const subcategories = getSubcategoryItems(item)
    const matchedSubcategories = subcategories.filter((subcategory) =>
      getSidebarItemLabel(subcategory).includes(normalizedQuery)
    )
    const isVisible =
      !normalizedQuery || categoryLabel.includes(normalizedQuery) || matchedSubcategories.length > 0
    item.style.display = isVisible ? '' : 'none'

    if (isVisible) {
      visibleCategoryCount += 1
      if (normalizedQuery && matchedSubcategories.length > 0) {
        matchedSubcategories.forEach((subcategory) => expandToItem(subcategory, item))
      }
    }
  })

  visibleCount.value = visibleCategoryCount
}

watch(query, async () => {
  await nextTick()
  applyFilter()
})

watch(
  () => route.path,
  async () => {
    query.value = ''
    await nextTick()
    applyFilter()
  }
)

onMounted(async () => {
  await nextTick()
  applyFilter()

  const sidebar = document.querySelector('.VPSidebar')
  if (sidebar) {
    sidebarMutationObserver = new MutationObserver(() => {
      window.clearTimeout(observerDebounceTimer)
      observerDebounceTimer = window.setTimeout(() => applyFilter(), OBSERVER_DEBOUNCE_DELAY_MS)
    })
    sidebarMutationObserver.observe(sidebar, { childList: true, subtree: true })
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(observerDebounceTimer)
  sidebarMutationObserver?.disconnect()
})
</script>

<template>
  <div v-if="route.path.startsWith('/posts/')" class="category-search">
    <label class="category-search__label" for="category-search-input">Search categories</label>
    <input
      id="category-search-input"
      v-model="query"
      class="category-search__input"
      type="search"
      placeholder="Type category name..."
      autocomplete="off"
    />
    <p v-if="query && visibleCount === 0" class="category-search__empty">No matching categories.</p>
  </div>
</template>

<style scoped>
.category-search {
  margin: 8px 12px 12px;
}

.category-search__label {
  display: block;
  margin-bottom: 6px;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.category-search__input {
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 6px 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.category-search__input:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.category-search__empty {
  margin-top: 6px;
  color: var(--vp-c-text-2);
  font-size: 12px;
}
</style>
