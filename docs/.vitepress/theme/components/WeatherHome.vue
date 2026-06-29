<template>
  <main
    class="weather-home"
    :class="[
      `weather-${scene.kind}`,
      scene.rainLevel ? `rain-${scene.rainLevel}` : '',
      scene.snowLevel ? `snow-${scene.snowLevel}` : ''
    ]"
  >
    <canvas ref="canvasRef" class="weather-canvas"></canvas>
    <div v-if="scene.kind === 'storm'" class="lightning-layer" aria-hidden="true"></div>
    <div v-if="scene.kind === 'clouds'" class="cloud-layer" aria-hidden="true">
      <span v-for="cloud in clouds" :key="cloud.id" :style="cloud.style"></span>
    </div>
    <div v-if="scene.kind === 'overcast'" class="overcast-layer" aria-hidden="true">
      <span v-for="cloud in overcastClouds" :key="cloud.id" :style="cloud.style"></span>
    </div>
    <div v-if="scene.kind === 'mist'" class="mist-layer" :class="`mist-${scene.mistLevel || 'moderate'}`" aria-hidden="true">
      <span v-for="band in mistBands" :key="band.id" :style="band.style"></span>
    </div>

    <div v-if="testerVisible" ref="weatherSwitcherRef" class="weather-switcher" aria-label="Weather preview">
      <button
        v-for="option in previewOptions"
        :key="option.id"
        type="button"
        :class="{ active: activePreview === option.id }"
        @click="setPreview(option)"
      >
        {{ option.label }}
      </button>
    </div>

    <button
      ref="weatherChipRef"
      class="weather-chip"
      type="button"
      :title="weatherTitle"
      aria-haspopup="dialog"
      :aria-expanded="cityPanelVisible"
      @click="toggleCityPanel"
    >
      <span class="weather-dot"></span>
      <span>{{ statusText }}</span>
    </button>

    <div
      v-if="cityPanelVisible"
      ref="weatherLocationPanelRef"
      class="weather-location-panel"
      role="dialog"
      aria-label="Weather location"
    >
      <div class="weather-location-controls">
        <button
          type="button"
          class="weather-location-auto"
          :class="{ active: selectedLocationMode === 'auto' }"
          @click="selectAutoLocation"
        >
          Auto
        </button>
        <div class="weather-location-search-wrap">
          <input
            ref="citySearchInputRef"
            v-model="citySearchQuery"
            class="weather-location-search"
            type="search"
            placeholder="Search Your City"
            autocomplete="off"
            id="citySearchInput"
            @input="queueCitySearch"
            @keydown.escape="closeCityPanel"
          />
        </div>
      </div>
      <div v-if="citySearchResults.length" class="weather-location-results">
        <button
          v-for="result in citySearchResults"
          :key="result.id"
          type="button"
          @click="selectCity(result)"
        >
          <span :title="result.name">{{ result.name }}</span>
          <small :title="result.region">{{ result.region }}</small>
        </button>
      </div>
      <p v-else-if="citySearchStatus" class="weather-location-status">
        {{ citySearchStatus }}
      </p>
    </div>

    <section class="home-hero">
      <p class="hero-kicker">FriedParrot.github.io</p>
      <h1>Hello, This is FriedParrot</h1>
      <p class="hero-copy">
        Minimalist blog, project notes, and practical technical references.
      </p>
    </section>

    <section class="home-panels" aria-label="Site sections">
      <a class="feature-panel" href="/knowledge-base/">
        <span>Knowledge base</span>
        <strong>I built this knowledge base to organize learning, develop better thinking and share with everyone.</strong>
      </a>
      <a class="feature-panel" href="/posts/">
        <span>Post</span>
        <strong>Short articles and informal essays for my daily life, experience and occasional inspirations</strong>
      </a>
      <a class="feature-panel" href="/projects">
        <span>Projects</span>
        <strong>Active work and useful build documentation.</strong>
      </a>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const WEATHER_CURRENT_FIELDS =
  'temperature_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,visibility,wind_speed_10m'
const LOCATION_UNAVAILABLE_LABEL = 'Location unavailable'
const WEATHER_STORAGE_KEY = 'friedparrot.weatherLocation.v1'
const WEATHER_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const canvasRef = ref(null)
const weatherSwitcherRef = ref(null)
const weatherChipRef = ref(null)
const weatherLocationPanelRef = ref(null)
const citySearchInputRef = ref(null)
const weather = ref(null)

const locationLabel = ref('Locating...')
const weatherError = ref(false)
const liveScene = ref({ kind: 'clear', label: 'Clear', code: 0 })
const scene = ref({ kind: 'clear', label: 'Clear', code: 0 })
const activePreview = ref('auto')
const testerVisible = ref(false)
const cityPanelVisible = ref(false)
const selectedLocationMode = ref('auto')
const citySearchQuery = ref('')
const citySearchResults = ref([])
const citySearchStatus = ref('')
const isDarkMode = ref(false)
let holdTimer = 0
let citySearchTimer = 0
let citySearchRequestId = 0

const previewOptions = [
  { id: 'auto', kind: 'auto', label: 'Auto' },
  { id: 'clear', kind: 'clear', label: 'Clear' },
  { id: 'clouds', kind: 'clouds', label: 'Clouds' },
  { id: 'overcast', kind: 'overcast', label: 'Overcast' },
  { id: 'rain-light', kind: 'rain', label: 'Light Rain', rainLevel: 'light' },
  { id: 'rain-moderate', kind: 'rain', label: 'Moderate Rain', rainLevel: 'moderate' },
  { id: 'rain-heavy', kind: 'rain', label: 'Heavy Rain', rainLevel: 'heavy' },
  { id: 'storm', kind: 'storm', label: 'Storm', rainLevel: 'heavy' },
  { id: 'snow-light', kind: 'snow', label: 'Light Snow', snowLevel: 'light' },
  { id: 'snow-moderate', kind: 'snow', label: 'Snow', snowLevel: 'moderate' },
  { id: 'snow-heavy', kind: 'snow', label: 'Heavy Snow', snowLevel: 'heavy' },
  { id: 'mist-light', kind: 'mist', label: 'Light Mist', mistLevel: 'light' },
  { id: 'mist-moderate', kind: 'mist', label: 'Mist', mistLevel: 'moderate' },
  { id: 'mist-heavy', kind: 'mist', label: 'Heavy Mist', mistLevel: 'heavy' }
]

const clouds = Array.from({ length: 6 }, (_, index) => ({
  id: index,
  style: {
    '--cloud-top': `${12 + index * 12}%`,
    '--cloud-left': `${-24 + index * 18}%`,
    '--cloud-scale': `${0.8 + (index % 3) * 0.16}`,
    '--cloud-speed': `${32 + index * 7}s`,
    '--cloud-delay': `${index * -6}s`
  }
}))

const overcastClouds = Array.from({ length: 12 }, (_, index) => ({
  id: index,
  style: {
    '--cloud-top': `${3 + (index % 6) * 12}%`,
    '--cloud-left': `${-36 + index * 12}%`,
    '--cloud-scale': `${1.08 + (index % 4) * 0.12}`,
    '--cloud-speed': `${48 + index * 4}s`,
    '--cloud-delay': `${index * -7}s`
  }
}))

const mistBands = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  style: {
    '--mist-top': `${8 + ((index * 17) % 76)}%`,
    '--mist-left': `${-72 + ((index * 29) % 126)}vw`,
    '--mist-width': `${42 + ((index * 11) % 38)}vw`,
    '--mist-height': `${24 + ((index * 7) % 22)}px`,
    '--mist-speed': `${32 + ((index * 5) % 24)}s`,
    '--mist-delay': `${index * -6.5}s`,
    '--mist-drift-x': `${92 + ((index * 13) % 48)}vw`,
    '--mist-drift-y': `${index % 3 === 0 ? 14 : index % 3 === 1 ? -10 : 5}px`,
    '--mist-band-opacity': `${0.72 + (index % 4) * 0.08}`,
    '--mist-scale': `${0.82 + (index % 5) * 0.1}`
  }
}))

const statusText = computed(() => {
  const temp = weather.value?.temperature_2m
  const label = scene.value.label
  const location = locationLabel.value
  if (activePreview.value !== 'auto') return `${location} - Preview - ${label}`
  if (location === LOCATION_UNAVAILABLE_LABEL) return LOCATION_UNAVAILABLE_LABEL
  if (weatherError.value) return `${location} - Weather unavailable`
  return temp === undefined ? `${location} - ${label}` : `${location} - ${label} - ${Math.round(temp)}\u00b0C`
})

const weatherTitle = computed(() => {
  const code = scene.value.code
  if (activePreview.value !== 'auto') return `Previewing ${scene.value.label}`
  if (locationLabel.value === LOCATION_UNAVAILABLE_LABEL) return LOCATION_UNAVAILABLE_LABEL
  if (weatherError.value) return `Weather unavailable for ${locationLabel.value}`
  return `Synced with ${locationLabel.value} current weather${code === undefined ? '' : ` - WMO ${code}`}`
})

function resolveScene(data) {
  const code = Number(data?.weather_code ?? 0)
  const rain = Number(data?.rain ?? 0) + Number(data?.showers ?? 0)
  const snow = Number(data?.snowfall ?? 0)
  const cloudCover = Number(data?.cloud_cover ?? 0)
  const visibility = Number(data?.visibility)

  if ([95, 96, 99].includes(code)) return { kind: 'storm', label: 'Lightning', code, rainLevel: 'heavy' }
  if ([71, 73, 75, 77, 85, 86].includes(code) || snow > 0) {
    const snowLevel = resolveSnowLevel(code, snow)
    const label = snowLevel === 'heavy' ? 'Heavy Snow' : snowLevel === 'moderate' ? 'Snow' : 'Light Snow'
    return { kind: 'snow', label, code, snowLevel }
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) || rain > 0) {
    const rainLevel = resolveRainLevel(code, rain)
    const label = rainLevel === 'heavy' ? 'Heavy Rain' : rainLevel === 'moderate' ? 'Moderate Rain' : 'Light Rain'
    return { kind: 'rain', label, code, rainLevel }
  }
  if ([45, 48].includes(code)) {
    const mistLevel = resolveMistLevel(code, visibility)
    const label = mistLevel === 'heavy' ? 'Heavy Mist' : mistLevel === 'moderate' ? 'Mist' : 'Light Mist'
    return { kind: 'mist', label, code, mistLevel }
  }
  if (code === 3 || cloudCover >= 85) return { kind: 'overcast', label: 'Overcast', code }
  if ([1, 2].includes(code) || cloudCover > 55) return { kind: 'clouds', label: 'Clouds', code }
  return { kind: 'clear', label: 'Clear', code }
}

function resolveMistLevel(code, visibility) {
  if (Number.isFinite(visibility)) {
    if (visibility <= 250) return 'heavy'
    if (visibility <= 1000) return 'moderate'
    return 'light'
  }

  return code === 48 ? 'heavy' : 'moderate'
}

function resolveSnowLevel(code, snow) {
  if ([75, 77, 86].includes(code) || snow >= 2.5) return 'heavy'
  if ([73, 85].includes(code) || snow >= 0.7) return 'moderate'
  return 'light'
}

function resolveRainLevel(code, rain) {
  if ([55, 57, 65, 67, 82].includes(code) || rain >= 7.6) return 'heavy'
  if ([53, 63, 66, 81].includes(code) || rain >= 2.5) return 'moderate'
  return 'light'
}

function buildWeatherUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: WEATHER_CURRENT_FIELDS,
    timezone: 'auto'
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

function buildCitySearchUrl(query) {
  const params = new URLSearchParams({
    name: query,
    count: '8',
    language: 'en',
    format: 'json'
  })
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 15 * 60 * 1000
    })
  })
}

function readStoredCity() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(WEATHER_STORAGE_KEY) || 'null')
    if (!stored || stored.mode !== 'manual' || stored.expiresAt <= Date.now()) {
      window.localStorage.removeItem(WEATHER_STORAGE_KEY)
      return null
    }
    if (!Number.isFinite(stored.latitude) || !Number.isFinite(stored.longitude) || !stored.label) return null
    return stored
  } catch {
    return null
  }
}

function saveStoredCity(city) {
  try {
    window.localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify({
      mode: 'manual',
      label: city.label,
      latitude: city.latitude,
      longitude: city.longitude,
      expiresAt: Date.now() + WEATHER_STORAGE_TTL_MS
    }))
  } catch {
    console.info('[WeatherHome] Could not persist weather location.')
  }
}

function clearStoredCity() {
  try {
    window.localStorage.removeItem(WEATHER_STORAGE_KEY)
  } catch {}
}

function formatCityResult(result) {
  const regionParts = [result.admin1, result.country].filter(Boolean)
  return {
    id: `${result.id}-${result.latitude}-${result.longitude}`,
    name: result.name,
    region: regionParts.join(', '),
    label: result.name,
    latitude: Number(result.latitude),
    longitude: Number(result.longitude)
  }
}

async function resolveLocationLabel(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      localityLanguage: 'en'
    })
    const response = await fetch(`https://api-bdc.io/data/reverse-geocode-client?${params.toString()}`)
    if (!response.ok) throw new Error(`Location request failed: ${response.status}`)
    const data = await response.json()
    return data.city || ''
  } catch {
    console.info('[WeatherHome] City lookup unavailable.')
    return ''
  }
}

function resetLiveWeather() {
  weather.value = null
  weatherError.value = false
  liveScene.value = { kind: 'clear', label: 'Clear', code: 0 }
  if (activePreview.value === 'auto') scene.value = liveScene.value
}

function useFallbackWeather(label = LOCATION_UNAVAILABLE_LABEL) {
  locationLabel.value = label
  resetLiveWeather()
}

async function fetchWeather(latitude, longitude) {
  try {
    const response = await fetch(buildWeatherUrl(latitude, longitude))
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)
    const data = await response.json()
    weather.value = data.current
    weatherError.value = false
    liveScene.value = resolveScene(data.current)
    if (activePreview.value === 'auto') scene.value = liveScene.value
    return true
  } catch {
    console.info('[WeatherHome] Weather fetch unavailable for browser coordinates.')
    resetLiveWeather()
    weatherError.value = true
    return false
  }
}

async function syncWeatherToBrowserLocation() {
  try {
    const { coords } = await getBrowserPosition()
    const { latitude, longitude } = coords
    const labelPromise = resolveLocationLabel(latitude, longitude)
    await fetchWeather(latitude, longitude)
    const resolvedLabel = await labelPromise
    locationLabel.value = resolvedLabel || LOCATION_UNAVAILABLE_LABEL
  } catch {
    console.info('[WeatherHome] Browser geolocation unavailable or permission was denied.')
    useFallbackWeather()
  }
}

async function syncWeatherToStoredCity(city) {
  selectedLocationMode.value = 'manual'
  locationLabel.value = city.label
  await fetchWeather(city.latitude, city.longitude)
}

async function initializeWeatherLocation() {
  const storedCity = readStoredCity()
  if (storedCity) {
    await syncWeatherToStoredCity(storedCity)
    return
  }
  selectedLocationMode.value = 'auto'
  await syncWeatherToBrowserLocation()
}

function toggleCityPanel() {
  cityPanelVisible.value = !cityPanelVisible.value
  if (cityPanelVisible.value) {
    nextTick(() => citySearchInputRef.value?.focus())
  }
}

function closeCityPanel() {
  cityPanelVisible.value = false
}

async function selectAutoLocation() {
  selectedLocationMode.value = 'auto'
  clearStoredCity()
  closeCityPanel()
  locationLabel.value = 'Locating...'
  await syncWeatherToBrowserLocation()
}

function queueCitySearch() {
  window.clearTimeout(citySearchTimer)
  citySearchTimer = window.setTimeout(searchCities, 240)
}

async function searchCities() {
  const query = citySearchQuery.value.trim()
  citySearchResults.value = []
  if (query.length < 2) {
    citySearchStatus.value = ''
    return
  }

  const requestId = ++citySearchRequestId
  citySearchStatus.value = 'Searching...'
  try {
    const response = await fetch(buildCitySearchUrl(query))
    if (!response.ok) throw new Error(`City search failed: ${response.status}`)
    const data = await response.json()
    if (requestId !== citySearchRequestId) return

    citySearchResults.value = (data.results || [])
      .map(formatCityResult)
      .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude))
    citySearchStatus.value = citySearchResults.value.length ? '' : 'No cities found'
  } catch {
    if (requestId !== citySearchRequestId) return
    citySearchStatus.value = 'City search unavailable'
  }
}

async function selectCity(city) {
  selectedLocationMode.value = 'manual'
  saveStoredCity(city)
  closeCityPanel()
  citySearchQuery.value = ''
  citySearchResults.value = []
  citySearchStatus.value = ''
  await syncWeatherToStoredCity(city)
}

function setPreview(option) {
  activePreview.value = option.id
  if (option.kind === 'auto') {
    scene.value = liveScene.value
    return
  }
  scene.value = {
    kind: option.kind,
    label: option.label,
    code: undefined,
    rainLevel: option.rainLevel,
    snowLevel: option.snowLevel,
    mistLevel: option.mistLevel
  }
}

function isAppearanceToggle(target) {
  return Boolean(
    target?.closest?.('.VPSwitchAppearance, button[aria-label*="appearance" i], button[title*="appearance" i]')
  )
}

function setupHiddenSwitcher() {
  function clearHold() {
    window.clearTimeout(holdTimer)
    holdTimer = 0
  }

  function onPointerDown(event) {
    if (event.button !== 0) return

    const target = event.target
    const switcher = weatherSwitcherRef.value
    const weatherPanel = weatherLocationPanelRef.value
    const weatherChip = weatherChipRef.value
    const isInsideSwitcher = Boolean(switcher?.contains(target))
    const isInsideWeatherLocation = Boolean(weatherPanel?.contains(target) || weatherChip?.contains(target))

    if (testerVisible.value && !isInsideSwitcher) {
      testerVisible.value = false
    }

    if (cityPanelVisible.value && !isInsideWeatherLocation) {
      cityPanelVisible.value = false
    }

    if (!isAppearanceToggle(target)) return
    clearHold()
    holdTimer = window.setTimeout(() => {
      testerVisible.value = !testerVisible.value
      holdTimer = 0
    }, 1700)
  }

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointerup', clearHold, true)
  document.addEventListener('pointercancel', clearHold, true)
  document.addEventListener('pointerleave', clearHold, true)

  return () => {
    clearHold()
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('pointerup', clearHold, true)
    document.removeEventListener('pointercancel', clearHold, true)
    document.removeEventListener('pointerleave', clearHold, true)
  }
}

function setupAppearanceObserver() {
  const root = document.documentElement
  const sync = () => {
    isDarkMode.value = root.classList.contains('dark')
  }
  const observer = new MutationObserver(sync)
  sync()
  observer.observe(root, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return () => {}

  const context = canvas.getContext('2d')
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = 0
  let height = 0
  let animationId = 0
  let particles = []
  let ripples = []
  let lightning = null
  let nextLightningAt = 0
  let lastScene = ''

  const random = (min, max) => min + Math.random() * (max - min)

  function scaledRainCount(baseCount) {
    const baseArea = 1280 * 720
    const scale = Math.min(Math.max((width * height) / baseArea, 0.9), 2.35)
    return Math.round(baseCount * scale)
  }

  function scaledSnowCount(baseCount) {
    const baseArea = 1280 * 720
    const scale = Math.min(Math.max((width * height) / baseArea, 0.85), 2.1)
    return Math.round(baseCount * scale)
  }

  function getRainProfile(kind) {
    if (kind === 'storm') {
      return { count: scaledRainCount(170), minLength: 14, maxLength: 32, minSpeed: 6.4, maxSpeed: 11.2, minOpacity: 0.72, maxOpacity: 0.86 }
    }

    if (scene.value.rainLevel === 'heavy') {
      return { count: scaledRainCount(145), minLength: 12, maxLength: 28, minSpeed: 5.8, maxSpeed: 10.2, minOpacity: 0.72, maxOpacity: 0.86 }
    }

    if (scene.value.rainLevel === 'moderate') {
      return { count: scaledRainCount(96), minLength: 11, maxLength: 25, minSpeed: 5.4, maxSpeed: 9, minOpacity: 0.72, maxOpacity: 0.86 }
    }

    return { count: scaledRainCount(66), minLength: 9, maxLength: 20, minSpeed: 4.2, maxSpeed: 7, minOpacity: 0.72, maxOpacity: 0.86 }
  }

  function getSnowProfile() {
    if (scene.value.snowLevel === 'heavy') {
      return {
        count: scaledSnowCount(170),
        minRadius: 1.2,
        maxRadius: 4.2,
        minDrift: -1.2,
        maxDrift: 1.1,
        minSpeed: 0.85,
        maxSpeed: 2.3,
        minOpacity: 0.28,
        maxOpacity: 0.68,
        gust: 0.42
      }
    }

    if (scene.value.snowLevel === 'moderate') {
      return {
        count: scaledSnowCount(105),
        minRadius: 1.1,
        maxRadius: 3.6,
        minDrift: -0.8,
        maxDrift: 0.8,
        minSpeed: 0.55,
        maxSpeed: 1.55,
        minOpacity: 0.2,
        maxOpacity: 0.52,
        gust: 0.28
      }
    }

    return {
      count: scaledSnowCount(52),
      minRadius: 0.9,
      maxRadius: 2.8,
      minDrift: -0.45,
      maxDrift: 0.55,
      minSpeed: 0.32,
      maxSpeed: 0.95,
      minOpacity: 0.14,
      maxOpacity: 0.36,
      gust: 0.18
    }
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const parentRect = canvas.parentElement?.getBoundingClientRect()
    width = rect.width || parentRect?.width || window.innerWidth
    height = rect.height || parentRect?.height || window.innerHeight
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    particles = createParticles(scene.value.kind)
  }

  function createParticles(kind) {
    if (kind === 'rain' || kind === 'storm') {
      const profile = getRainProfile(kind)
      return Array.from({ length: profile.count }, () => ({
        x: random(0, width),
        y: random(-height, height),
        groundY: random(height * 0.7, height * 0.98),
        length: random(profile.minLength, profile.maxLength),
        speed: random(profile.minSpeed, profile.maxSpeed),
        opacity: random(profile.minOpacity, profile.maxOpacity)
      }))
    }

    if (kind === 'snow') {
      const profile = getSnowProfile()
      return Array.from({ length: profile.count }, () => ({
        x: random(0, width),
        y: random(-height, height),
        radius: random(profile.minRadius, profile.maxRadius),
        drift: random(profile.minDrift, profile.maxDrift),
        speed: random(profile.minSpeed, profile.maxSpeed),
        phase: random(0, Math.PI * 2),
        opacity: random(profile.minOpacity, profile.maxOpacity),
        gust: random(profile.gust * 0.35, profile.gust)
      }))
    }

    return Array.from({ length: isDarkMode.value ? 94 : 34 }, (_, index) => ({
      x: index % 9 === 0 ? random(width * 0.36, width * 0.64) : random(0, width),
      y: index % 9 === 0 ? random(height * 0.2, height * 0.52) : random(0, height * 0.74),
      radius: index % 13 === 0 ? random(1.8, 3.2) : random(0.7, 1.6),
      phase: random(0, Math.PI * 2),
      speed: random(0.008, 0.024),
      opacity: random(0.16, isDarkMode.value ? 0.72 : 0.32),
      warm: index % 9 === 0
    }))
  }

  function drawClear() {
    const starColor = isDarkMode.value ? '255, 221, 116' : '121, 141, 174'
    const glowColor = isDarkMode.value ? '255, 214, 102' : '247, 188, 76'
    particles.forEach((star) => {
      star.phase += star.speed
      const pulse = 0.45 + Math.sin(star.phase) * 0.28
      const alpha = Math.max(0.06, star.opacity + pulse * 0.24)
      context.beginPath()
      context.fillStyle = star.warm ? `rgba(${glowColor}, ${alpha})` : `rgba(${starColor}, ${alpha})`
      context.arc(star.x, star.y, star.radius + pulse * 0.7, 0, Math.PI * 2)
      context.fill()
    })
  }

  function drawRain(kind) {
    const rippleStrength = scene.value.rainLevel === 'light' ? 0.72 : 1
    const visibility = isDarkMode.value ? 1.08 : 1.32
    context.lineWidth = kind === 'storm' || scene.value.rainLevel === 'heavy' ? 0.9 : 0.82
    context.strokeStyle = kind === 'storm'
      ? isDarkMode.value ? 'rgba(205, 225, 255, 0.46)' : 'rgba(84, 125, 190, 0.72)'
      : isDarkMode.value ? 'rgba(132, 190, 242, 0.58)' : 'rgba(51, 116, 183, 0.7)'
    particles.forEach((drop) => {
      context.globalAlpha = Math.min(drop.opacity * visibility, 0.95)
      context.beginPath()
      context.moveTo(drop.x, drop.y)
      const endY = Math.min(drop.y + drop.length, drop.groundY)
      context.lineTo(drop.x - (endY - drop.y) * 0.22, endY)
      context.stroke()
      drop.x -= drop.speed * 0.18
      drop.y += drop.speed

      if (drop.y + drop.length >= drop.groundY) {
        ripples.push({
          x: drop.x,
          y: drop.groundY,
          radius: random(1.2, 2.2),
          alpha: (random(0.14, 0.32) + random(0.2, 0.3)) * rippleStrength * visibility,
          speed: random(0.34, 0.58) * rippleStrength
        })
        drop.x = random(0, width)
        drop.y = random(-80, -20)
        drop.groundY = random(height * 0.7, height * 0.98)
      }
    })
    context.globalAlpha = 1

    ripples = ripples.filter((ripple) => ripple.alpha > 0.01)
    ripples.forEach((ripple) => {
      context.beginPath()
      context.strokeStyle = isDarkMode.value
        ? `rgba(111, 177, 230, ${Math.min(ripple.alpha * 0.95, 0.78)})`
        : `rgba(45, 128, 202, ${Math.min(ripple.alpha, 0.86)})`
      context.lineWidth = 1
      context.ellipse(ripple.x, ripple.y, ripple.radius * 1.9, ripple.radius * 0.58, 0, 0, Math.PI * 2)
      context.stroke()
      ripple.radius += ripple.speed
      ripple.alpha *= 0.95
    })
  }

  function drawSnow() {
    particles.forEach((flake) => {
      flake.phase += 0.014 + flake.speed * 0.006
      flake.x += flake.drift + Math.sin(flake.phase) * flake.gust
      flake.y += flake.speed
      if (flake.y > height + 10) {
        flake.x = random(0, width)
        flake.y = random(-60, -10)
      }
      if (flake.x < -20) flake.x = width + 20
      if (flake.x > width + 20) flake.x = -20
      context.beginPath()
      context.fillStyle = isDarkMode.value
        ? `rgba(235, 248, 255, ${flake.opacity})`
        : `rgba(112, 136, 156, ${Math.min(flake.opacity + 0.22, 0.72)})`
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
      context.fill()
    })
  }

  function makeLightning() {
    const startX = random(width * 0.18, width * 0.82)
    const maxDepth = random(height * 0.24, height * 0.46)
    const segmentCount = Math.round(random(8, 13))
    const points = [{ x: startX, y: random(-10, height * 0.04) }]
    let x = startX

    for (let i = 1; i <= segmentCount; i += 1) {
      const progress = i / segmentCount
      x += random(-26, 26) + Math.sin(progress * Math.PI * 1.8) * random(-14, 14)
      x = Math.max(width * 0.08, Math.min(width * 0.92, x))
      points.push({
        x,
        y: progress * maxDepth + random(-8, 12)
      })
    }

    const branches = []
    const branchCount = Math.round(random(2, 5))
    for (let i = 0; i < branchCount; i += 1) {
      const startIndex = Math.round(random(2, points.length - 3))
      const origin = points[startIndex]
      const branch = [{ ...origin }]
      const direction = Math.random() > 0.5 ? 1 : -1
      const branchSegments = Math.round(random(3, 6))
      let bx = origin.x
      let by = origin.y

      for (let j = 0; j < branchSegments; j += 1) {
        bx += direction * random(14, 36)
        by += random(10, 24)
        branch.push({ x: bx, y: by })
      }
      branches.push(branch)
    }

    return {
      points,
      branches,
      born: performance.now(),
      duration: random(130, 220),
      glow: random(0.65, 0.95)
    }
  }

  function strokePath(points) {
    context.beginPath()
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y)
      else context.lineTo(point.x, point.y)
    })
    context.stroke()
  }

  function drawLightning() {
    const now = performance.now()
    if (!lightning && now > nextLightningAt) {
      lightning = makeLightning()
    }

    if (!lightning) return

    const age = now - lightning.born
    if (age > lightning.duration) {
      lightning = null
      nextLightningAt = now + random(2600, 6200)
      return
    }

    const flicker = age < 45 || (age > 82 && age < 130) ? 1 : 0.38
    const alpha = lightning.glow * flicker * (1 - age / lightning.duration)
    const glowColor = isDarkMode.value ? 'rgba(167, 205, 255,' : 'rgba(88, 125, 180,'

    context.save()
    context.globalCompositeOperation = isDarkMode.value ? 'screen' : 'source-over'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    const topGlow = context.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, width * 0.45)
    topGlow.addColorStop(0, `${glowColor} ${0.2 * alpha})`)
    topGlow.addColorStop(1, `${glowColor} 0)`)
    context.fillStyle = topGlow
    context.fillRect(0, 0, width, height * 0.55)

    context.shadowBlur = 10
    context.shadowColor = isDarkMode.value ? 'rgba(180, 218, 255, 0.48)' : 'rgba(96, 129, 188, 0.28)'
    context.strokeStyle = isDarkMode.value ? `rgba(180, 218, 255, ${0.26 * alpha})` : `rgba(74, 105, 162, ${0.28 * alpha})`
    context.lineWidth = 3.2
    strokePath(lightning.points)

    context.shadowBlur = 4
    context.strokeStyle = isDarkMode.value ? `rgba(255, 249, 188, ${0.86 * alpha})` : `rgba(255, 229, 126, ${0.72 * alpha})`
    context.lineWidth = 1.2
    strokePath(lightning.points)

    context.shadowBlur = 1.5
    context.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`
    context.lineWidth = 0.55
    strokePath(lightning.points)

    lightning.branches.forEach((branch) => {
      context.shadowBlur = 3
      context.strokeStyle = isDarkMode.value ? `rgba(190, 226, 255, ${0.42 * alpha})` : `rgba(83, 119, 180, ${0.28 * alpha})`
      context.lineWidth = 0.8
      strokePath(branch)
      context.strokeStyle = `rgba(255, 247, 183, ${0.58 * alpha})`
      context.lineWidth = 0.35
      strokePath(branch)
    })

    context.restore()
  }

  function animate() {
    context.clearRect(0, 0, width, height)

    const sceneKey = [
      scene.value.kind,
      scene.value.rainLevel ?? 'none',
      scene.value.snowLevel ?? 'none',
      scene.value.mistLevel ?? 'none',
      isDarkMode.value
    ].join('-')

    if (lastScene !== sceneKey) {
      lastScene = sceneKey
      particles = createParticles(scene.value.kind)
      ripples = []
    }

    if (scene.value.kind === 'rain' || scene.value.kind === 'storm') drawRain(scene.value.kind)
    else if (scene.value.kind === 'snow') drawSnow()
    else if (scene.value.kind === 'clear' || scene.value.kind === 'clouds') drawClear()

    if (scene.value.kind === 'storm') drawLightning()
    else {
      lightning = null
      nextLightningAt = 0
    }

    animationId = window.requestAnimationFrame(animate)
  }

  resize()
  if (!mediaQuery.matches) animate()
  window.addEventListener('resize', resize)

  return () => {
    window.cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  }
}

let cleanupCanvas = () => {}
let cleanupSwitcher = () => {}
let cleanupAppearanceObserver = () => {}

onMounted(() => {
  initializeWeatherLocation()
  cleanupAppearanceObserver = setupAppearanceObserver()
  cleanupCanvas = setupCanvas()
  cleanupSwitcher = setupHiddenSwitcher()
})

onUnmounted(() => {
  window.clearTimeout(citySearchTimer)
  cleanupCanvas()
  cleanupSwitcher()
  cleanupAppearanceObserver()
})
</script>
