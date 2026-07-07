import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SidebarCategorySearch from './components/SidebarCategorySearch.vue'
import WeatherHome from './components/WeatherHome.vue'
import ProjectList from './components/ProjectList.vue'
import ProjectPage from './components/ProjectPage.vue'
import ProjectIndexLayout from './components/ProjectIndexLayout.vue'
import { installEquationCitatorPreviews } from '../../../packages/equation-citator/dist/runtime.js'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('WeatherHome', WeatherHome)
    app.component('ProjectList', ProjectList)
    app.component('ProjectPage', ProjectPage)
    app.component('ProjectIndexLayout', ProjectIndexLayout)
    installEquationCitatorPreviews({ router })
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarCategorySearch)
    })
  }
}
