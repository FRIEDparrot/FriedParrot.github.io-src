<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()
const featuredProject = computed(() => theme.value.featuredProject ?? null)
</script>

<template>
  <section class="home-hero">
    <h1>Hi, It's FriedParrot,</h1>
    <p>
      I share notes, experiments, and project write-ups focused on practical engineering, clean tooling,
      and long-term knowledge capture.
    </p>

    <article v-if="featuredProject" class="featured-card">
      <h2>Featured Project</h2>
      <p><strong>{{ featuredProject.name }}</strong></p>
      <p>{{ featuredProject.description }}</p>
      <a :href="featuredProject.link" target="_blank" rel="noreferrer">Open Project</a>
    </article>
  </section>
</template>
