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

<script lang="ts" src="./WeatherHome.ts"></script>
