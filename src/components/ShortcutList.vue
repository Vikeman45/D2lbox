<template>
  <aside class="app-grid-right">
    <h4>Keyboard Shortcuts</h4>
    <template v-for="(data, context) in registeredKeys" :key="context">
      <p> {{ context }} </p>
      <div class="list-item">
        <div 
          v-for="key in data"
          :key="key.id"
          class="wrapper"
        >
          <div>
            <span
              v-for="char in key.keys"
              :key="char.length"
              class="key"
            >
              {{ char.toUpperCase() }}
            </span>
          </div>
          <div class="description">
            {{ key.description }}
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppShortcutKeysStore } from '@/stores/appShortcutKeysStore'

const { registeredKeys } = storeToRefs(useAppShortcutKeysStore())
</script>

<style scoped>
  aside {
    background-color: var(--nav-bg-color);
    color: var(--nav-text-color);
  }

  h4 {
    border-top: 5px solid var(--main-bg-color);
    border-bottom: 1px solid var(--main-bg-color);
    height: min-content;
    padding: 1em 1em;
  }

  .list-item {
    display: grid;
    grid-template-columns: max-content max-content;
    height: fit-content;
  }

  .wrapper {
    display: contents;
  }
  
  .list-item span::before {
    content: "+";
  }

  .list-item span:first-of-type::before {
    content: "";
  }

  .description {
    margin-left: 1.5em;
  }


</style>
