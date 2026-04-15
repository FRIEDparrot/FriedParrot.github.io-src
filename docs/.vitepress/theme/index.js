import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    const route = useRoute()
    const isPostsHome = route.path === '/posts/'
    const isPostArticle = route.path.startsWith('/posts/') && !isPostsHome

    return h(
      'div',
      {
        class: [
          isPostsHome ? 'show-posts-sidebar' : 'hide-posts-sidebar',
          isPostArticle ? 'is-post-article' : 'not-post-article'
        ]
      },
      h(DefaultTheme.Layout)
    )
  }
}
