import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SidebarCategorySearch from './components/SidebarCategorySearch.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarCategorySearch)
    })
  }
}
