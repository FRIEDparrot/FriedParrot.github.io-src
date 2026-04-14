import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import HomeHero from './components/HomeHero.vue'
import PostsCategoryIndex from './components/PostsCategoryIndex.vue'
import TagsView from './components/TagsView.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeHero', HomeHero)
    app.component('PostsCategoryIndex', PostsCategoryIndex)
    app.component('TagsView', TagsView)
  }
} satisfies Theme
