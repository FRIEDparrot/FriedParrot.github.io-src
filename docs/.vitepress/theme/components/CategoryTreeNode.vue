<script setup lang="ts">
import type { CategoryNode } from '../data/posts'

defineOptions({ name: 'CategoryTreeNode' })

defineProps<{
  node: CategoryNode
}>()

const emit = defineEmits<{
  select: [path: string]
}>()
</script>

<template>
  <li>
    <details open>
      <summary>
        <a href="#" @click.prevent="emit('select', node.path)">{{ node.name }} ({{ node.posts.length }})</a>
      </summary>

      <ul v-if="node.children.length">
        <CategoryTreeNode v-for="child in node.children" :key="child.path" :node="child" @select="emit('select', $event)" />
      </ul>
    </details>
  </li>
</template>
