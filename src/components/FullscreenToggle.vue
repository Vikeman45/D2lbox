<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isFullscreen = ref()

async function toggleFullscreen() {
  if (!isFullscreen.value) {
    try {
      await document.getElementsByTagName('HTML')[0].requestFullscreen()
    } catch (err) {
      alert("Couldn't enter fullscreen mode")
      console.error(err)
    }
  } else {
    document.exitFullscreen()
  }
}

onMounted(() => {
  isFullscreen.value = document.fullscreenElement !== null
  document.addEventListener(
    'fullscreenchange',
    () => (isFullscreen.value = document.fullscreenElement !== null),
  )
})

onUnmounted(() => {
  console.log('onUnmounted from FullscreenToggle')
  document.removeEventListener(
    'fullscreenchange',
    () => (isFullscreen.value = document.fullscreenElement !== null),
  )
})
</script>

<template>
  <button
    v-if="isFullscreen"
    @click="toggleFullscreen"
    style="cursor: nwse-resize"
    title="Exit Full Screen Mode (or Press ESC)"
  >
    <slot name="fullscreenButtonContent">
      <svg width="20" height="20">
        <rect
          y="8"
          width="10"
          height="10"
          rx="2"
          ry="2"
          stroke-width="1"
          stroke="white"
          fill="transparent"
        />
        <polyline
          points="4, 6, 10, 6, 12, 8, 12, 15"
          stroke-width="1"
          stroke="white"
          fill="transparent"
        />
      </svg>
    </slot>
  </button>
  <button
    v-else
    @click="toggleFullscreen"
    style="cursor: nesw-resize"
    title="Go to Full Screen Mode"
  >
    <slot name="notFullscreenButtonContent">
      <svg width="20" height="20">
        <rect
          y="8"
          width="12"
          height="12"
          rx="2"
          ry="2"
          stroke-width="1"
          stroke="white"
          fill="transparent"
        />
      </svg>
    </slot>
  </button>
</template>

<style scoped>
nav {
  font-size: 20px;
  margin: 0;
  padding: 10px;
  overflow: hidden;
  background-color: #2c2926;
  color: white;
  position: relative;
}

a {
  text-align: center;
  padding: 0.5em 1em;
  text-decoration: none;
  color: white;
}

a:hover {
  background-color: #fc7202;
  transform: scale(1.1);
  transition: 0.4s;
}

a:focus {
  border: 1px solid #fc7202;
}

button {
  background-color: #2c2926;
  color: white;
  border: none;
  float: right;
  font-size: 20px;
}
</style>
