<script setup lang="ts">
import FullscreenToggle from './FullscreenToggle.vue'
import RouterButton from '@/components/RouterButton.vue'
import { useMenuStructureStore } from '@/stores/menuStructureStore'
import { storeToRefs } from 'pinia'

const { menuItemData } = storeToRefs(useMenuStructureStore())
</script>

<template>
  <nav>
    <RouterButton
      v-for="item in menuItemData"
      :key="item.routeName"
      :route-name="item.routeName"
      :text="item.descriptor"
      :shortcut-key="item.shortcutKey"
      class="nav-button"
    />
    <FullscreenToggle />
  </nav>
</template>

<style scoped>
nav {
  font-size: 20px;
  margin: 0;
  padding: 0 0;
  overflow: hidden;
  background-color: var(--nav-bg-color);
  color: var(--nav-text-color);
  position: relative;
}
</style>
