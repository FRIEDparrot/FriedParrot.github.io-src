<template>
  <div class="project-list">
    <aside class="project-tags-sidebar" aria-label="Filter projects">
      <section class="project-filter-group">
        <button
          type="button"
          class="project-filter-heading"
          :aria-expanded="tagsOpen"
          @click="tagsOpen = !tagsOpen"
        >
          <span>Tags</span>
          <small>{{ availableTags.length }}</small>
        </button>

        <div v-if="tagsOpen" class="project-filter-body">
          <div class="project-filter-search-wrap">
            <input
              v-model.trim="tagSearch"
              class="project-filter-search"
              type="search"
              placeholder="Search tags"
              aria-label="Search tags"
            />
          </div>

          <div class="project-filter-list">
            <button
              type="button"
              :class="{ active: selectedTag === '' }"
              @click="selectedTag = ''"
            >
              <span>All</span>
              <small>{{ projects.length }}</small>
            </button>
            <button
              v-for="tag in visibleTagFilters"
              :key="tag.name"
              type="button"
              :class="{ active: selectedTag === tag.name }"
              @click="selectedTag = tag.name"
            >
              <span>{{ tag.name }}</span>
              <small>{{ tag.count }}</small>
            </button>
          </div>
          <button
            v-if="hiddenTagCount"
            type="button"
            class="project-filter-toggle"
            @click="showAllTags = !showAllTags"
          >
            {{ showAllTags ? 'Show fewer' : `More... ${hiddenTagCount}` }}
          </button>
        </div>
      </section>

      <section v-if="availableLanguages.length" class="project-filter-group">
        <button
          type="button"
          class="project-filter-heading"
          :aria-expanded="languagesOpen"
          @click="languagesOpen = !languagesOpen"
        >
          <span>Language</span>
          <small>{{ availableLanguages.length }}</small>
        </button>

        <div v-if="languagesOpen" class="project-filter-body">
          <div class="project-filter-list">
            <button
              type="button"
              :class="{ active: selectedLanguage === '' }"
              @click="selectedLanguage = ''"
            >
              <span>All</span>
              <small>{{ projects.length }}</small>
            </button>
            <button
              v-for="language in visibleLanguageFilters"
              :key="language.name"
              type="button"
              :class="{ active: selectedLanguage === language.name }"
              @click="selectedLanguage = language.name"
            >
              <span>{{ language.name }}</span>
              <small>{{ language.count }}</small>
            </button>
          </div>
          <button
            v-if="hiddenLanguageCount"
            type="button"
            class="project-filter-toggle"
            @click="showAllLanguages = !showAllLanguages"
          >
            {{ showAllLanguages ? 'Show fewer' : `More... ${hiddenLanguageCount}` }}
          </button>
        </div>
      </section>
    </aside>

    <div class="project-main">
      <div class="project-toolbar">
        <div class="project-total-stars" :aria-label="loading ? 'Total stars loading' : `${totalStars} total stars`">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/>
          </svg>
          <span>Total Stars</span>
          <strong>{{ loading ? '...' : formatNumber(totalStars) }}</strong>
        </div>
        <div class="project-sort" aria-label="Sort projects">
          <button
            v-for="option in sortOptions"
            :key="option.id"
            type="button"
            :class="{ active: sortBy === option.id }"
            @click="sortBy = option.id"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <template v-if="loading">
        <div class="project-grid">
          <div v-for="project in projects" :key="project.name" class="project-card project-card-skeleton">
            <div class="skeleton-line skeleton-name"></div>
            <div class="skeleton-line skeleton-desc"></div>
            <div class="skeleton-line skeleton-desc skeleton-desc-short"></div>
            <div class="skeleton-line skeleton-meta"></div>
            <div class="skeleton-tags">
              <span v-for="tag in 3" :key="tag" class="skeleton-tag"></span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <section
          v-for="section in visibleSections"
          :key="section.key"
          class="project-section"
          :class="{
            'project-section-featured': section.tag,
            'project-section-divided': section.divided,
            'project-section-filtered': section.filtered
          }"
        >
          <div v-if="section.tag" class="project-section-heading">
            <h2>{{ section.tag }}</h2>
            <span>{{ section.projects.length }} projects</span>
          </div>

          <div class="project-grid">
            <a
              v-for="project in section.projects"
              :key="project.name"
              class="project-card"
              :href="project.href"
              :target="project.page ? undefined : '_blank'"
              :rel="project.page ? undefined : 'noopener noreferrer'"
            >
              <div class="project-card-head">
                <h3 class="project-card-name">{{ project.name }}</h3>
                <span v-if="project.page" class="project-card-doc-badge">Documentation</span>
              </div>

              <p class="project-card-desc">
                {{ project.description || 'GitHub metadata unavailable.' }}
              </p>

              <div class="project-card-stats" aria-label="Repository statistics">
                <span :aria-label="project.stars === null ? 'Stars unavailable' : `${project.stars} stars`">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/>
                  </svg>
                  {{ project.stars === null ? 'Unavailable' : formatNumber(project.stars) }}
                </span>
                <span :aria-label="project.downloads === null ? 'Release downloads unavailable' : `${project.downloads} release downloads`">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M7.25 1.5a.75.75 0 0 1 1.5 0v6.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V1.5zM2.75 11a.75.75 0 0 1 .75.75v1.5h9v-1.5a.75.75 0 0 1 1.5 0V14a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 14v-2.25a.75.75 0 0 1 .75-.75z"/>
                  </svg>
                  {{ project.downloads === null ? 'Unavailable' : formatNumber(project.downloads) }}
                </span>
                <span v-if="project.updatedAt" :aria-label="`Updated ${formatDate(project.updatedAt)}`">
                  {{ formatDate(project.updatedAt) }}
                </span>
              </div>

              <div class="project-card-meta">
                <span v-if="project.language" class="project-card-lang">
                  <span class="project-lang-dot" :data-lang="project.language"></span>
                  {{ project.language }}
                </span>
                <span v-if="project.license">{{ project.license }}</span>
              </div>

              <div v-if="project.tags.length" class="project-card-tags">
                <span v-for="tag in project.tags" :key="tag" class="project-tag">{{ tag }}</span>
              </div>
            </a>
          </div>
        </section>

        <p v-if="!visibleSections.length" class="project-empty">No projects match these filters.</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { data as projectData } from '../data/projects.data.js'

const CACHE_KEY = 'friedparrot.projectMeta.v7'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FEATURED_TAG_MIN_COUNT = 3
const VISIBLE_TAG_LIMIT = 10
const VISIBLE_LANGUAGE_LIMIT = 6

const sortOptions = [
  { id: 'stars', label: 'Stars' },
  { id: 'updated', label: 'Recently Updated' },
  { id: 'downloads', label: 'Downloads' }
]

const projects = projectData.projects
const loading = ref(true)
const metaCache = ref({})
const sortBy = ref('stars')
const selectedTag = ref('')
const selectedLanguage = ref('')
const showAllTags = ref(false)
const showAllLanguages = ref(false)
const tagsOpen = ref(true)
const languagesOpen = ref(true)
const tagSearch = ref('')

function repoFullName(project) {
  return project.repo || `${project.owner || 'FRIEDparrot'}/${project.name}`
}

function repoParts(project) {
  const [owner = 'FRIEDparrot', repo = project.name] = repoFullName(project).split('/')
  return { owner, repo }
}

function repoUrl(project) {
  return `https://github.com/${repoFullName(project)}`
}

function unghRepoApiUrl(project) {
  return `https://ungh.cc/repos/${repoFullName(project)}`
}

function githubOwnerReposApiUrl(owner) {
  return `https://api.github.com/users/${owner}/repos?per_page=100&type=owner&sort=updated`
}

function shieldsStarsUrl(project) {
  return `https://img.shields.io/github/stars/${repoFullName(project)}.json`
}

function shieldsDownloadsUrl(project) {
  return `https://img.shields.io/github/downloads/${repoFullName(project)}/total.json`
}

function shieldsLicenseUrl(project) {
  return `https://img.shields.io/github/license/${repoFullName(project)}.json`
}

function shieldsLanguageUrl(project) {
  return `https://img.shields.io/github/languages/top/${repoFullName(project)}.json`
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : []
}

function mergeStringLists(...lists) {
  return [...new Set(lists.flatMap(normalizeStringList))]
}

function projectFallbackMeta(project) {
  return {
    description: '',
    stars: null,
    downloads: null,
    updatedAt: '',
    tags: [],
    language: project.language || null,
    license: null,
    htmlUrl: null,
    metadataLoaded: false,
    tagsLoaded: false
  }
}

function readCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (!cache || !cache.data || typeof cache.data !== 'object') return {}
    return Object.fromEntries(
      Object.entries(cache.data).map(([key, meta]) => [
        key,
        {
          ...meta,
          cachedAt: Number(meta?.cachedAt || cache.ts || 0)
        }
      ])
    )
  } catch {
    return {}
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data }))
  } catch {}
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, application/vnd.github+json'
    }
  })
  if (!response.ok) return null
  return response.json()
}

async function fetchUnghRepo(project) {
  const data = await fetchJson(unghRepoApiUrl(project))
  return data?.repo || null
}

const githubOwnerReposCache = new Map()

async function fetchGithubOwnerRepos(owner) {
  if (!githubOwnerReposCache.has(owner)) {
    githubOwnerReposCache.set(owner, fetchJson(githubOwnerReposApiUrl(owner)))
  }

  const repos = await githubOwnerReposCache.get(owner)
  return Array.isArray(repos) ? repos : null
}

async function fetchGithubRepoFromOwnerList(project) {
  const { owner, repo } = repoParts(project)
  const repos = await fetchGithubOwnerRepos(owner)
  return {
    repo: repos?.find((item) => item.name?.toLowerCase() === repo.toLowerCase()) || null,
    loaded: Array.isArray(repos)
  }
}

function parseBadgeNumber(...values) {
  const message = values.find((value) => typeof value === 'string' && value.trim())
  if (!message) return null

  const match = message.trim().toLowerCase().match(/^([\d,.]+)\s*([kmb])?$/)
  if (!match) return null

  const value = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value)) return null

  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2]] || 1
  return Math.round(value * multiplier)
}

function parseBadgeText(...values) {
  const message = values.find((value) => typeof value === 'string' && value.trim())
  if (!message) return null
  if (/^(not found|inaccessible|invalid|unknown)$/i.test(message.trim())) return null
  return message.trim()
}

async function fetchShieldsStars(project) {
  const badge = await fetchJson(shieldsStarsUrl(project))
  return parseBadgeNumber(badge?.value, badge?.message)
}

async function fetchShieldsDownloads(project) {
  const badge = await fetchJson(shieldsDownloadsUrl(project))
  return parseBadgeNumber(badge?.value, badge?.message)
}

async function fetchShieldsLicense(project) {
  const badge = await fetchJson(shieldsLicenseUrl(project))
  return parseBadgeText(badge?.value, badge?.message)
}

async function fetchShieldsLanguage(project) {
  const badge = await fetchJson(shieldsLanguageUrl(project))
  const label = parseBadgeText(badge?.label)
  const value = parseBadgeText(badge?.value, badge?.message)

  if (label && !/^language$/i.test(label) && !/^\d+(\.\d+)?%$/.test(label)) return label
  if (value && !/^\d+(\.\d+)?%$/.test(value)) return value.replace(/\s+\d+(\.\d+)?%$/, '')

  return null
}

async function fetchRepoMeta(project) {
  try {
    const [unghRepo, githubRepoResult, stars, downloads, license, language] = await Promise.all([
      fetchUnghRepo(project),
      fetchGithubRepoFromOwnerList(project),
      fetchShieldsStars(project),
      fetchShieldsDownloads(project),
      fetchShieldsLicense(project),
      fetchShieldsLanguage(project)
    ])

    const partialRepo = unghRepo || null
    const githubRepo = githubRepoResult.repo
    const unghTopics = normalizeStringList(partialRepo?.topics)
    const githubTopics = normalizeStringList(githubRepo?.topics)
    const tagsLoaded = unghTopics.length > 0 || githubRepoResult.loaded
    if (!partialRepo && !githubRepo && stars === null && downloads === null && !license && !language) return null

    return {
      description: partialRepo?.description || githubRepo?.description || '',
      stars: stars ?? partialRepo?.stars ?? githubRepo?.stargazers_count ?? null,
      downloads: downloads ?? null,
      updatedAt: partialRepo?.pushedAt || githubRepo?.pushed_at || partialRepo?.updatedAt || githubRepo?.updated_at || '',
      tags: mergeStringLists(unghTopics, githubTopics),
      language: project.language || language || githubRepo?.language || null,
      license: license || null,
      htmlUrl: repoUrl(project),
      metadataLoaded: true,
      tagsLoaded
    }
  } catch (error) {
    console.warn(`Unable to load GitHub metadata for ${repoFullName(project)}`, error)
    return null
  }
}

function mergeMeta(cachedMeta, fetchedMeta, fallbackMeta) {
  const base = cachedMeta || fallbackMeta
  if (!fetchedMeta) return base

  const nextTags = fetchedMeta.tags.length ? fetchedMeta.tags : base.tags

  return {
    ...base,
    ...fetchedMeta,
    description: fetchedMeta.description || base.description,
    stars: fetchedMeta.stars ?? base.stars,
    downloads: fetchedMeta.downloads ?? base.downloads,
    updatedAt: fetchedMeta.updatedAt || base.updatedAt,
    tags: nextTags,
    language: fetchedMeta.language || base.language,
    license: fetchedMeta.license || base.license,
    htmlUrl: fetchedMeta.htmlUrl || base.htmlUrl,
    metadataLoaded: fetchedMeta.metadataLoaded || base.metadataLoaded,
    tagsLoaded: fetchedMeta.tagsLoaded || base.tagsLoaded,
    cachedAt: fetchedMeta.tagsLoaded ? Date.now() : base.cachedAt
  }
}

function isCachedMetaFresh(meta) {
  return Boolean(meta?.tagsLoaded && meta.cachedAt && Date.now() - meta.cachedAt <= CACHE_TTL_MS)
}

async function loadProjectMeta() {
  const cached = readCache()
  const nextCache = { ...cached }
  const CONCURRENCY = 3

  projects.forEach((project) => {
    const key = repoFullName(project)
    metaCache.value[key] = cached[key] || projectFallbackMeta(project)
  })

  for (let i = 0; i < projects.length; i += CONCURRENCY) {
    const batch = projects.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map(async (project) => {
        const key = repoFullName(project)
        const fallback = projectFallbackMeta(project)
        const cachedMeta = cached[key]
        if (isCachedMetaFresh(cachedMeta)) return { key, meta: cachedMeta }

        const meta = await fetchRepoMeta(project)
        const mergedMeta = mergeMeta(cachedMeta, meta, fallback)
        if (mergedMeta.metadataLoaded && mergedMeta.tagsLoaded) nextCache[key] = mergedMeta
        return { key, meta: mergedMeta }
      })
    )

    results.forEach(({ key, meta }) => {
      metaCache.value[key] = meta
    })
  }

  writeCache(nextCache)
}

const enrichedProjects = computed(() => projects.map((project) => {
  const meta = metaCache.value[repoFullName(project)] || projectFallbackMeta(project)
  const hasPage = project.page === true
  return {
    ...project,
    ...meta,
    page: hasPage,
    href: hasPage ? `/projects/${project.name}` : repoUrl(project)
  }
}))

const availableTags = computed(() => {
  const counts = new Map()
  enrichedProjects.value.forEach((project) => {
    project.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const filteredTags = computed(() => {
  const query = tagSearch.value.toLowerCase()
  if (!query) return availableTags.value
  return availableTags.value.filter((tag) => tag.name.toLowerCase().includes(query))
})

const visibleTagFilters = computed(() => {
  return showAllTags.value || tagSearch.value
    ? filteredTags.value
    : filteredTags.value.slice(0, VISIBLE_TAG_LIMIT)
})

const hiddenTagCount = computed(() => {
  if (tagSearch.value) return 0
  return Math.max(filteredTags.value.length - VISIBLE_TAG_LIMIT, 0)
})

const availableLanguages = computed(() => {
  const counts = new Map()
  enrichedProjects.value.forEach((project) => {
    if (project.language) counts.set(project.language, (counts.get(project.language) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const visibleLanguageFilters = computed(() => {
  return showAllLanguages.value ? availableLanguages.value : availableLanguages.value.slice(0, VISIBLE_LANGUAGE_LIMIT)
})

const hiddenLanguageCount = computed(() => Math.max(availableLanguages.value.length - VISIBLE_LANGUAGE_LIMIT, 0))

const featuredTags = computed(() => {
  const counts = new Map()
  enrichedProjects.value.forEach((project) => {
    project.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  })
  return Array.from(counts.entries())
    .filter(([, count]) => count >= FEATURED_TAG_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
})

const sortedProjects = computed(() => {
  const filtered = enrichedProjects.value.filter((project) => {
    const tagMatches = selectedTag.value ? project.tags.includes(selectedTag.value) : true
    const languageMatches = selectedLanguage.value ? project.language === selectedLanguage.value : true
    return tagMatches && languageMatches
  })

  return [...filtered].sort((a, b) => {
    if (sortBy.value === 'downloads') return (b.downloads ?? -1) - (a.downloads ?? -1) || a.name.localeCompare(b.name)
    if (sortBy.value === 'updated') return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0) || a.name.localeCompare(b.name)
    return (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name)
  })
})

const totalStars = computed(() => enrichedProjects.value.reduce((sum, project) => sum + (project.stars ?? 0), 0))

const visibleSections = computed(() => {
  if (selectedTag.value) {
    return sortedProjects.value.length
      ? [{ key: selectedTag.value, tag: selectedTag.value, projects: sortedProjects.value, divided: false, filtered: true }]
      : []
  }

  const used = new Set()
  const sections = featuredTags.value
    .map((tag) => {
      const sectionProjects = sortedProjects.value.filter((project) => project.tags.includes(tag))
      sectionProjects.forEach((project) => used.add(project.name))
      return { key: tag, tag, projects: sectionProjects }
    })
    .filter((section) => section.projects.length)

  const otherProjects = sortedProjects.value.filter((project) => !used.has(project.name))
  if (otherProjects.length) sections.push({ key: 'other', tag: '', projects: otherProjects })

  const hasFeaturedSections = sections.some((section) => section.tag)

  return sections.map((section, index) => ({
    ...section,
    divided: hasFeaturedSections && index > 0
  }))
})

function formatNumber(value) {
  const numericValue = Number(value || 0)
  return new Intl.NumberFormat('en', { notation: numericValue >= 1000 ? 'compact' : 'standard' }).format(numericValue)
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

onMounted(async () => {
  await loadProjectMeta()
  loading.value = false
})
</script>

<style scoped>
.project-list {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  align-items: start;
  gap: 32px;
  width: 100%;
  margin-top: 28px;
}

.project-tags-sidebar {
  position: sticky;
  top: calc(var(--vp-nav-height) + 24px);
  align-self: start;
  padding-top: 1px;
}

.project-filter-group + .project-filter-group {
  margin-top: 20px;
}

.project-filter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--vp-c-divider);
  min-height: 34px;
  padding: 0 0 9px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.project-filter-heading span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 800;
}

.project-filter-heading span::before {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--vp-c-text-3);
  border-bottom: 1.5px solid var(--vp-c-text-3);
  content: "";
  transform: rotate(45deg) translateY(-1px);
  transition: transform 0.18s ease;
}

.project-filter-heading[aria-expanded='false'] span::before {
  transform: rotate(-45deg);
}

.project-filter-heading small {
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.project-filter-body {
  margin-top: 12px;
}

.project-main {
  min-width: 0;
}

.project-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 34px;
  margin-bottom: 16px;
}

.project-total-stars {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  border: 1px solid color-mix(in srgb, #f6c85f 45%, var(--vp-c-divider));
  border-radius: 999px;
  padding: 0 12px;
  color: var(--vp-c-text-2);
  background: color-mix(in srgb, #f6c85f 10%, var(--vp-c-bg-soft));
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.project-total-stars svg {
  width: 14px;
  height: 14px;
  fill: #f6c85f;
}

.project-total-stars strong {
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 800;
}

.project-filter-list {
  display: grid;
  gap: 7px;
}

.project-filter-search-wrap {
  position: relative;
  margin-bottom: 10px;
}

.project-filter-search-wrap::before {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 13px;
  height: 13px;
  content: "";
  transform: translateY(-50%);
  background: currentColor;
  color: var(--vp-c-text-3);
  mask:
    radial-gradient(circle at 42% 42%, transparent 0 3.8px, #000 4.4px 5.7px, transparent 6.1px),
    linear-gradient(45deg, transparent 0 56%, #000 56% 72%, transparent 72%);
}

.project-filter-search {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  padding: 0 10px 0 30px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}

.project-filter-search::placeholder {
  color: var(--vp-c-text-3);
}

.project-filter-search:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.project-sort {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.project-sort button,
.project-filter-list button {
  min-height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  padding: 0 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.project-filter-list button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0 10px;
  text-align: left;
}

.project-filter-list button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-filter-list button small {
  color: inherit;
  opacity: 0.68;
  font-size: 11px;
}

.project-sort button.active,
.project-filter-list button.active {
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
  background: var(--vp-c-brand-1);
}

.project-filter-toggle {
  width: 100%;
  min-height: 30px;
  margin-top: 8px;
  border: 0;
  border-radius: 7px;
  color: var(--vp-c-brand-1);
  background: transparent;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.project-filter-toggle:hover {
  background: var(--vp-c-bg-soft);
}

.project-section-divided {
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.project-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 9px;
}

.project-section-filtered {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.project-section-heading h2 {
  margin: 0;
  border-top: 0;
  padding-top: 0;
  color: var(--vp-c-text-1);
  font-size: 18px;
  font-weight: 800;
}

.project-section-heading span {
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.project-card {
  display: flex;
  min-height: 216px;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 18px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.project-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.project-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.project-card-name {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.project-card-doc-badge {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 42%, transparent);
  border-radius: 5px;
  padding: 2px 7px;
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-soft) 72%, transparent);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.45;
  white-space: nowrap;
}

.project-card-desc {
  flex: 1;
  margin: 0 0 14px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.55;
}

.project-card-stats,
.project-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.project-card-stats {
  margin-bottom: 9px;
}

.project-card-stats span,
.project-card-lang {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.project-card-stats svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.project-card-stats span:first-child svg {
  fill: #f6c85f;
}

.project-lang-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.project-lang-dot[data-lang='TypeScript'] { background: #3178c6; }
.project-lang-dot[data-lang='JavaScript'] { background: #f7df1e; }
.project-lang-dot[data-lang='Python'] { background: #3776ab; }
.project-lang-dot[data-lang='MATLAB'] { background: #e16737; }
.project-lang-dot[data-lang='Vue'] { background: #41b883; }

.project-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.project-tag {
  border-radius: 5px;
  padding: 2px 8px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.5;
}

.project-empty {
  margin: 28px 0 0;
  color: var(--vp-c-text-2);
}

.project-card-skeleton {
  pointer-events: none;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: var(--vp-c-divider);
  animation: skeleton-pulse 1.6s ease-in-out infinite;
}

.skeleton-name {
  width: 70%;
  height: 18px;
  margin-bottom: 14px;
}

.skeleton-desc {
  width: 100%;
  margin-bottom: 8px;
}

.skeleton-desc-short {
  width: 55%;
}

.skeleton-meta {
  width: 44%;
  height: 12px;
  margin-top: 14px;
}

.skeleton-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.skeleton-tag {
  width: 52px;
  height: 20px;
  border-radius: 5px;
  background: var(--vp-c-divider);
  animation: skeleton-pulse 1.6s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

@media (max-width: 1160px) {
  .project-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .project-list {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .project-tags-sidebar {
    position: static;
  }

  .project-filter-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .project-filter-list button {
    width: auto;
    max-width: 180px;
  }

  .project-toolbar,
  .project-sort {
    justify-content: flex-start;
  }

  .project-toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 620px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
