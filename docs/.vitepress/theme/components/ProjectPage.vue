<template>
  <div class="project-page">
    <div class="project-page-header">
      <a href="/projects" class="project-back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        All Projects
      </a>
      <a class="project-gh-link" :href="repoUrl" target="_blank" rel="noopener noreferrer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        {{ repo }}
      </a>
    </div>

    <div v-if="loading" class="project-page-loading">
      <span class="project-page-spinner"></span>
      Loading README from {{ repo }}…
    </div>

    <div v-else-if="error" class="project-page-error">
      <p>Failed to load project README.</p>
      <p class="project-page-error-detail">{{ error }}</p>
      <a :href="repoUrl" target="_blank" rel="noopener noreferrer">View on GitHub →</a>
    </div>

    <div v-else class="project-page-body">
      <div v-if="repoMeta" class="project-meta-bar">
        <span v-if="repoMeta.language" class="project-meta-item">
          <span class="project-lang-dot" :data-lang="repoMeta.language"></span>
          {{ repoMeta.language }}
        </span>
        <span class="project-meta-item">
          <svg class="project-star-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>
          {{ repoMeta.stars }} stars
        </span>
        <span v-if="repoMeta.license" class="project-meta-item">{{ repoMeta.license }}</span>
      </div>
      <div v-if="repoMeta?.tags?.length" class="project-meta-tags">
        <span v-for="tag in repoMeta.tags" :key="tag" class="project-tag">{{ tag }}</span>
      </div>
      <article class="project-readme" v-html="readmeHtml"></article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  repo: { type: String, required: true }
})

const readmeHtml = ref('')
const loading = ref(true)
const error = ref('')
const repoMeta = ref(null)

const repoUrl = computed(() => `https://github.com/${props.repo}`)

async function fetchRepoMeta() {
  try {
    const res = await fetch(`https://api.github.com/repos/${props.repo}`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      language: data.language || null,
      stars: data.stargazers_count ?? 0,
      license: data.license?.spdx_id || null,
      tags: data.topics || [],
      description: data.description || ''
    }
  } catch {
    return null
  }
}

async function fetchReadme() {
  loading.value = true
  error.value = ''
  readmeHtml.value = ''
  repoMeta.value = null

  try {
    const [meta, readmeRes] = await Promise.all([
      fetchRepoMeta(),
      fetch(`https://api.github.com/repos/${props.repo}/readme`)
    ])
    repoMeta.value = meta

    if (!readmeRes.ok) {
      if (readmeRes.status === 404) throw new Error('This project does not have a README file.')
      throw new Error(`GitHub API returned ${readmeRes.status}`)
    }
    const readmeData = await readmeRes.json()
    const content = atob(readmeData.content)

    const renderRes = await fetch('https://api.github.com/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, mode: 'gfm' })
    })
    if (!renderRes.ok) throw new Error(`Markdown rendering failed (${renderRes.status})`)
    readmeHtml.value = await renderRes.text()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchReadme)
watch(() => props.repo, fetchReadme)
</script>

<style scoped>
.project-page {
  max-width: 860px;
  margin: 0 auto;
}

.project-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.project-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-brand-1);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.project-back-link:hover {
  text-decoration: underline;
}

.project-gh-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.project-gh-link:hover {
  color: var(--vp-c-text-1);
}

.project-page-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
}

.project-page-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: project-spin 0.7s linear infinite;
}

@keyframes project-spin {
  to { transform: rotate(360deg); }
}

.project-page-error {
  padding: 48px 0;
  color: var(--vp-c-text-2);
}

.project-page-error p {
  margin: 0 0 8px;
}

.project-page-error-detail {
  font-size: 13px;
  opacity: 0.7;
}

.project-page-error a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.project-meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.project-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.project-lang-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.project-lang-dot[data-lang='TypeScript'] { background: #3178c6; }
.project-lang-dot[data-lang='JavaScript'] { background: #f7df1e; }
.project-lang-dot[data-lang='Python']     { background: #3776ab; }
.project-lang-dot[data-lang='MATLAB']     { background: #e16737; }

.project-star-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: #f6c85f;
}

.project-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 28px;
}

.project-tag {
  display: inline-block;
  border-radius: 5px;
  padding: 2px 8px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

/* README content styling */
.project-readme :deep(h1) {
  margin-top: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.project-readme :deep(h2) {
  margin-top: 32px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.project-readme :deep(h3) {
  margin-top: 24px;
}

.project-readme :deep(img) {
  max-width: 100%;
}

.project-readme :deep(pre) {
  border-radius: 8px;
}

.project-readme :deep(table) {
  display: block;
  overflow: auto;
}

.project-readme :deep(a) {
  color: var(--vp-c-brand-1);
}
</style>
