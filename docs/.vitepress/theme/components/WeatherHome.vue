<template>
  <main
    class="weather-home"
    :class="[`weather-${scene.kind}`, scene.rainLevel ? `rain-${scene.rainLevel}` : '']"
  >
    <canvas ref="canvasRef" class="weather-canvas" aria-hidden="true"></canvas>
    <div v-if="scene.kind === 'storm'" class="lightning-layer" aria-hidden="true"></div>
    <div v-if="scene.kind === 'clouds' || scene.kind === 'mist'" class="cloud-layer" aria-hidden="true">
      <span v-for="cloud in clouds" :key="cloud.id" :style="cloud.style"></span>
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

      <div class="hero-actions">
        <a class="hero-button hero-button-primary" href="/posts/">Read Posts</a>
        <a class="hero-button hero-button-secondary" href="/projects">View Projects</a>
      </div>
    </section>

    <section class="home-panels" aria-label="Site sections">
      <a class="feature-panel" href="/posts/">
        <span>Posts</span>
        <strong>Writing, references, and implementation notes.</strong>
      </a>
      <a class="feature-panel" href="/projects">
        <span>Projects</span>
        <strong>Active work and useful build documentation.</strong>
      </a>
      <a class="feature-panel" href="/about">
        <span>About</span>
        <strong>Contact details and a compact profile.</strong>
      </a>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const WEATHER_CURRENT_FIELDS =
  'temperature_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m'
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
  { id: 'rain-light', kind: 'rain', label: 'Light Rain', rainLevel: 'light' },
  { id: 'rain-moderate', kind: 'rain', label: 'Moderate Rain', rainLevel: 'moderate' },
  { id: 'rain-heavy', kind: 'rain', label: 'Heavy Rain', rainLevel: 'heavy' },
  { id: 'storm', kind: 'storm', label: 'Storm', rainLevel: 'heavy' },
  { id: 'snow', kind: 'snow', label: 'Snow' },
  { id: 'mist', kind: 'mist', label: 'Mist' }
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

  if ([95, 96, 99].includes(code)) return { kind: 'storm', label: 'Lightning', code, rainLevel: 'heavy' }
  if ([71, 73, 75, 77, 85, 86].includes(code) || snow > 0) return { kind: 'snow', label: 'Snow', code }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) || rain > 0) {
    const rainLevel = resolveRainLevel(code, rain)
    const label = rainLevel === 'heavy' ? 'Heavy Rain' : rainLevel === 'moderate' ? 'Moderate Rain' : 'Light Rain'
    return { kind: 'rain', label, code, rainLevel }
  }
  if ([45, 48].includes(code)) return { kind: 'mist', label: 'Mist', code }
  if ([1, 2, 3].includes(code) || cloudCover > 55) return { kind: 'clouds', label: 'Clouds', code }
  return { kind: 'clear', label: 'Clear', code }
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
    rainLevel: option.rainLevel
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
      return Array.from({ length: 86 }, () => ({
        x: random(0, width),
        y: random(-height, height),
        radius: random(1.1, 3.6),
        drift: random(-0.7, 0.7),
        speed: random(0.45, 1.4),
        phase: random(0, Math.PI * 2),
        opacity: random(0.16, 0.46)
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
      flake.phase += 0.018
      flake.x += flake.drift + Math.sin(flake.phase) * 0.25
      flake.y += flake.speed
      if (flake.y > height + 10) {
        flake.x = random(0, width)
        flake.y = random(-60, -10)
      }
      context.beginPath()
      context.fillStyle = isDarkMode.value
        ? `rgba(235, 248, 255, ${flake.opacity})`
        : `rgba(112, 136, 156, ${Math.min(flake.opacity + 0.22, 0.72)})`
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
      context.fill()
    })
  }

  function drawMist() {
    const time = Date.now() * 0.00008
    for (let i = 0; i < 8; i += 1) {
      const y = height * (0.16 + i * 0.095)
      const x = ((time * (32 + i * 4) + i * 180) % (width + 360)) - 180
      const gradient = context.createLinearGradient(x - 160, y, x + 160, y)
      gradient.addColorStop(0, 'rgba(180, 195, 205, 0)')
      gradient.addColorStop(0.5, 'rgba(180, 195, 205, 0.12)')
      gradient.addColorStop(1, 'rgba(180, 195, 205, 0)')
      context.fillStyle = gradient
      context.fillRect(x - 170, y, 340, 26)
    }
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

    if (lastScene !== `${scene.value.kind}-${scene.value.rainLevel ?? 'none'}-${isDarkMode.value}`) {
      lastScene = `${scene.value.kind}-${scene.value.rainLevel ?? 'none'}-${isDarkMode.value}`
      particles = createParticles(scene.value.kind)
      ripples = []
    }

    if (scene.value.kind === 'rain' || scene.value.kind === 'storm') drawRain(scene.value.kind)
    else if (scene.value.kind === 'snow') drawSnow()
    else if (scene.value.kind === 'mist') drawMist()
    else drawClear()

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
