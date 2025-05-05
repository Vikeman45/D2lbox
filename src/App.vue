<template>
  <header class="app-grid-top">
    <img src="./assets/logo2.png" alt="Tom Clancy's The Division 2 Toolbox" />

    <MainNav />
  </header>

  <RouterView />

  <ShortcutList v-if="showShortcutKeys" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import MainNav from './components/MainNav.vue'
import ShortcutList from '@/components/ShortcutList.vue'
import { useAppShortcutKeysStore } from '@/stores/appShortcutKeysStore.ts'

const { showShortcutKeys } = storeToRefs(useAppShortcutKeysStore())
</script>

<style scoped>
img {
  display: block;
  height: 75px;
  margin: 2em auto;
}
</style>
