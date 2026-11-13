<script setup lang="ts">
import { useData } from 'vitepress'
import { onMounted, ref } from 'vue'

// The release job writes versions.json at the site root, newest first: ["v0.2", "v0.1"]. Reading it
// at runtime lets an old build list versions released after it. A build knows which version it is
// from its base: /v0.1/ is v0.1, and / is the newest.
const { site } = useData()
const versions = ref<string[]>([])
const current = ref('')

onMounted(async () => {
  const listed = await fetch('/versions.json')
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => [])
  // A missing or malformed file (any dev server) hides the switcher instead of breaking the nav.
  versions.value = Array.isArray(listed) ? listed.filter((v) => typeof v === 'string') : []
  current.value = site.value.base === '/' ? versions.value[0] : site.value.base.slice(1, -1)
})

// Stays on the same page in the other version; a page that doesn't exist there gets the 404 page.
// The newest version lives at the root, so choosing it goes there rather than to its own folder.
function go(event: Event) {
  const version = (event.target as HTMLSelectElement).value
  const page = location.pathname.slice(site.value.base.length)
  location.href = version === versions.value[0] ? `/${page}` : `/${version}/${page}`
}
</script>

<template>
  <select v-if="versions.length" class="versions" :value="current" aria-label="Docs version" @change="go">
    <option v-for="(version, i) in versions" :key="version" :value="version">
      {{ i === 0 ? `${version} (latest)` : version }}
    </option>
  </select>
</template>

<style scoped>
.versions {
  margin-left: 16px;
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}
</style>
