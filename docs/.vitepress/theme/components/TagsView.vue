<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { postsData } from '../data/posts'

const route = useRoute()
const router = useRouter()

const safeData = computed(() => postsData)
const tags = computed(() => Object.keys(safeData.value.tags))

const currentHash = ref('')

function syncHash() {
  if (typeof window === 'undefined') {
    currentHash.value = ''
    return
  }
  currentHash.value = window.location.hash
}

onMounted(() => {
  syncHash()
  window.addEventListener('hashchange', syncHash)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', syncHash)
  }
})

const activeTag = computed(() => decodeURIComponent(currentHash.value.replace(/^#/, '').toLowerCase()))

const posts = computed(() => {
  if (!activeTag.value) {
    return []
  }
  return safeData.value.tags[activeTag.value] || []
})

function pickTag(tag: string) {
  router.go(`${route.path}#${encodeURIComponent(tag)}`)
  syncHash()
}
</script>

<template>
  <section>
    <h1>Tags</h1>
    <p>Click a tag to list all matching posts across every category.</p>

    <div>
      <button v-for="tag in tags" :key="tag" type="button" class="tag-chip" @click="pickTag(tag)">
        #{{ tag }}
      </button>
    </div>

    <div v-if="activeTag">
      <h2>Results for #{{ activeTag }}</h2>
      <ul>
        <li v-for="post in posts" :key="post.url">
          <a :href="post.url">{{ post.title }}</a>
          <span class="category-chip">{{ post.categoryPath.join(' / ') }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
