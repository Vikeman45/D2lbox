<script setup lang="ts">
import BaseSVG from '@/components/BaseSVG.vue'
</script>

<template>
  <main class="analyze app-grid-main">
    <BaseSVG />
  </main>
</template>

<style lang="css">
.analyze {
  margin: 5px;
  border: 1px solid var(--nav-bg-color);
  height: calc(100% - 10px);
  width: calc(100% - 10px);
  line-height: 1;
}
</style>
