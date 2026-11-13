import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

// Every page includes a document from where it lives in the repo, and the page paths copy the repo's
// layout, so the root README's relative links land on real pages without editing the README.
export default defineConfig({
  title: 'Caelus',
  description: 'Define a command once. Dispatch it from anywhere.',
  // The index is the root README, real content rather than a landing page, so agents get it too.
  vite: { plugins: [llmstxt({ excludeIndexPage: false })] },
  themeConfig: {
    sidebar: [
      { text: 'Overview', link: '/' },
      {
        text: 'Packages',
        items: [
          { text: '@ufo-soft/caelus', link: '/packages/caelus' },
          { text: '@ufo-soft/caelus-cli', link: '/packages/cli' },
          { text: '@ufo-soft/caelus-mcp', link: '/packages/mcp' },
        ],
      },
      { text: 'Architecture', link: '/architecture' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/ufo-soft/caelus' }],
  },
})
