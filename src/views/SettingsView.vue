<script setup lang="ts">
import { useAppShortcutKeysStore } from '@/stores/appShortcutKeysStore'
import { storeToRefs } from 'pinia'

const { showShortcutKeys } = storeToRefs(useAppShortcutKeysStore())
</script>

<template>
  <main class="about app-grid-main">
    <h1>This is the Settings page</h1>
    <input id="shortcuts" type="checkbox" v-model="showShortcutKeys" />
    <label for="shortcuts">Show Shortcuts?</label>
  </main>
</template>

<style scoped>
h1 {
  padding: 1em 1em;
  margin: 0 auto;
}

input {
  margin: 1em 1em 1em 2em;
}

label {
  margin: 1em 0;
}
</style>
