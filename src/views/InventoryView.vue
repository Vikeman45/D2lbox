<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import RouterButton from '@/components/RouterButton.vue'
import StrictInput from '@/components/StrictInput.vue'
import { useMenuStructureStore } from '@/stores/menuStructureStore'
import { useAppDatabaseStore } from '@/stores/appDatabaseStore'

const data = useAppDatabaseStore()
const { menuItemData } = storeToRefs(useMenuStructureStore())
const items = computed(() => menuItemData.value[1].children)
const weaponModels = ref([] as { name: string; id: number }[])

watchEffect(async () => {
  weaponModels.value = (await data.getData('weaponModels', ['name', 'id'])).sort((w1, w2) =>
    w1.name > w2.name ? 1 : -1,
  )
})
</script>

<template>
  <main class="inventory app-grid-main">
    <h1>This is the Inventory page</h1>
    <input />
    <StrictInput :options="weaponModels" />
    <input />
  </main>

  <nav class="app-grid-left">
    <RouterButton
      v-for="item in items"
      :key="item.routeName"
      route-name="links"
      :text="item.descriptor"
      :shortcut-key="item.shortcutKey"
      class="nav-button"
    />
  </nav>
</template>

<style scoped>
.app-grid-left {
  display: flex;
  flex-direction: column;
}

button {
  height: fit-content;
}

nav {
  font-size: 20px;
  margin: 0;
  padding: 10px;
  overflow: hidden;
  background-color: var(--nav-bg-color);
  color: var(--nav-text-color);
  position: relative;
  border-top: 5px solid var(--main-bg-color);
}

a {
  text-align: center;
  padding: 0.5em 1em;
  text-decoration: none;
  color: var(--nav-text-color);
  display: block;
}

a:hover {
  background-color: var(--nav-hover-color);
  transform: scale(1.1);
  transition: 0.3s;
}

a:focus {
  border: 1px solid var(--nav-hover-color);
  color: var(--nav-hover-color);
  transform: scale(1.1);
  transition: 0.3s;
}

a:focus:hover {
  color: var(--nav-text-color);
}
</style>
