<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

const updateSidebarClass = () => {
  if (typeof document === 'undefined') return
  const onlyPostsIndex = route.path === '/posts/'
  document.documentElement.classList.toggle('show-posts-sidebar', onlyPostsIndex)
}

onMounted(() => updateSidebarClass())
watch(
  () => route.path,
  () => updateSidebarClass()
)

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('show-posts-sidebar')
})
</script>

<template>
  <DefaultTheme.Layout />
</template>
