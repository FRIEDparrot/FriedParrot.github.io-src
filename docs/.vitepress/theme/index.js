import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SidebarCategorySearch from './components/SidebarCategorySearch.vue'
import WeatherHome from './components/WeatherHome.vue'
import ProjectList from './components/ProjectList.vue'
import ProjectIndexLayout from './components/ProjectIndexLayout.vue'
import { installEquationCitatorPreviews } from '@friedparrot/equation-citator/runtime'
import './custom.css'

function redirectSlashNotFoundToIndex(router) {
  if (typeof window === 'undefined' || !router) return

  const previousRouteChanged = router.onAfterRouteChanged
  router.onAfterRouteChanged = (to) => {
    previousRouteChanged?.(to)

    const { pathname, search, hash } = window.location
    if (router.route.data?.isNotFound && pathname !== '/') {
      const newRoutePath = `${pathname}index.html`
      if(pathname.endsWith('/')) window.location.replace(`${newRoutePath}${search}${hash}`)
    }
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('WeatherHome', WeatherHome)
    app.component('ProjectList', ProjectList)
    app.component('ProjectIndexLayout', ProjectIndexLayout)
    installEquationCitatorPreviews({ router })
    redirectSlashNotFoundToIndex(router)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarCategorySearch)
    })
  }
}
