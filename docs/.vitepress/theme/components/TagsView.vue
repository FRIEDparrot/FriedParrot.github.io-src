<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { data as content } from '../content.data'

type LoadedContent = {
  tags: Record<string, Array<{ title: string; url: string; sourcePath: string; categoryPath: string[] }>>
}

const data = content as LoadedContent
const { frontmatter } = useData()
const currentTag = ref('')

const sortedTags = computed(() => Object.keys(data.tags).sort((a, b) => a.localeCompare(b)))

const updateFromHash = () => {
  if (typeof window === 'undefined') return
  currentTag.value = decodeURIComponent(window.location.hash.replace(/^#/, '')).toLowerCase()
}

onMounted(() => {
  updateFromHash()
  window.addEventListener('hashchange', updateFromHash)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('hashchange', updateFromHash)
})

const selectedPosts = computed(() => (currentTag.value ? data.tags[currentTag.value] || [] : []))
</script>

<template>
  <section class="tags-view">
    <h2>All Tags</h2>
    <p class="hint">Select a tag to view all matching posts across categories.</p>
    <ul class="tag-list">
      <li v-for="tag in sortedTags" :key="tag">
        <a :href="`${frontmatter?.permalink ?? '/tags/'}#${encodeURIComponent(tag)}`">#{{ tag }}</a>
      </li>
    </ul>

    <section v-if="currentTag" class="tag-results">
      <h3>Posts tagged #{{ currentTag }}</h3>
      <ul>
        <li v-for="post in selectedPosts" :key="post.url">
          <a :href="post.url">{{ post.title }}</a>
          <small> — {{ post.categoryPath.join(' / ') }}</small>
        </li>
      </ul>
      <p v-if="selectedPosts.length === 0">No posts found for this tag.</p>
    </section>
  </section>
</template>

<style scoped>
.tags-view { margin-top: 1rem; }
.hint { opacity: 0.75; }
.tag-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag-list a {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
}
.tag-results ul { padding-left: 1rem; }
</style>
