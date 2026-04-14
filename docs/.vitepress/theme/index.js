import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    const route = useRoute()
    const showPostsSidebar = route.path === '/posts/'

    return h(
      'div',
      { class: showPostsSidebar ? 'show-posts-sidebar' : 'hide-posts-sidebar' },
      h(DefaultTheme.Layout)
    )
  }
}
