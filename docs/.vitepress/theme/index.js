import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import { useRoute } from 'vitepress'
import SidebarCategorySearch from './components/SidebarCategorySearch.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    const route = useRoute()
    const isPostsIndex = route.path === '/posts/'
    const isPostArticle = route.path.startsWith('/posts/') && !isPostsIndex

    return h(
      'div',
      {
        class: [
          isPostsIndex ? 'show-posts-sidebar' : 'hide-posts-sidebar',
          { 'is-post-article': isPostArticle }
        ]
      },
      h(
        DefaultTheme.Layout,
        null,
        {
          'sidebar-nav-before': () => h(SidebarCategorySearch)
        }
      )
    )
  }
}
