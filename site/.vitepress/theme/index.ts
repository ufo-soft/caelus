import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import Versions from './Versions.vue'

// The default theme with the version switcher at the end of the nav bar.
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'nav-bar-content-after': () => h(Versions) }),
} satisfies Theme
