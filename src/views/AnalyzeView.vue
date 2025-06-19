<script setup lang="ts">
import BaseSVG from '@/components/BaseSVG.vue'
import NodeSummary from '@/components/NodeSummary.vue'
</script>

<template>
  <main class="analyze app-grid-main">
    <BaseSVG />
  </main>
  <NodeSummary />
</template>

<style lang="css">
.analyze {
  --margin: 5px;
  margin: var(--margin);
  border: 1px solid var(--nav-bg-color);
  height: calc(100% - 2 * var(--margin));
  width: calc(100% - 2 * var(--margin));
  line-height: 1;
}
</style>
