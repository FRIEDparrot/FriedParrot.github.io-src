<script setup lang="ts">
import { computed, ref } from 'vue'
import { postsData } from '../data/posts'
import CategoryTreeNode from './CategoryTreeNode.vue'

const sidebarOpen = ref(true)
const activeCategory = ref<string>('All')

const safeData = computed(() => postsData)

const categories = computed(() => safeData.value.categoryTree)

const visiblePosts = computed(() => {
  if (activeCategory.value === 'All') {
    return safeData.value.posts
  }

  return safeData.value.posts.filter((post) => post.categoryPath.join('/') === activeCategory.value)
})

function selectCategory(path: string) {
  activeCategory.value = path
}
</script>

<template>
  <section class="category-layout">
    <button class="category-fab" type="button" @click="sidebarOpen = !sidebarOpen">
      {{ sidebarOpen ? 'Hide Categories' : 'Show Categories' }}
    </button>

    <aside v-if="sidebarOpen" class="category-sidebar" aria-label="Category Sidebar">
      <h3>Categories</h3>
      <p><a href="#" @click.prevent="selectCategory('All')">All</a></p>
      <ul class="category-tree">
        <CategoryTreeNode v-for="category in categories" :key="category.path" :node="category" @select="selectCategory" />
      </ul>
    </aside>

    <div class="category-content">
      <h1>Posts</h1>
      <p>Browse by folder-based categories and nested subcategories.</p>
      <p>
        Active Category:
        <strong>{{ activeCategory }}</strong>
      </p>

      <ul>
        <li v-for="post in visiblePosts" :key="post.url">
          <a :href="post.url">{{ post.title }}</a>
          <span class="category-chip">{{ post.categoryPath.join(' / ') }}</span>
          <template v-if="post.tags.length">
            <a
              v-for="tag in post.tags"
              :key="`${post.url}-${tag}`"
              class="tag-chip"
              :href="`/tags/#${encodeURIComponent(tag)}`"
            >
              #{{ tag }}
            </a>
          </template>
        </li>
      </ul>
    </div>
  </section>
</template>
