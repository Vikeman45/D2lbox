<script setup lang="ts">
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppShortcutKeysStore, type tAppKeyRecordLocator } from '@/stores/appShortcutKeysStore'

const props = defineProps<{
  routeName: string
  text?: string
  shortcutKey?: string
}>()
let location: number
const startText = ref('')
const endText = ref('')

const buttonText = computed(() => {
  return props?.text ? props.text : props.routeName[0].toUpperCase() + props.routeName.slice(1)
})
const hasKey = computed(() => typeof props.shortcutKey === 'string')

if (hasKey.value) {
  location = buttonText.value.toUpperCase().indexOf((props.shortcutKey as string).toUpperCase())
  if (location === -1) {
    startText.value = `${buttonText.value} (`
    endText.value = ')'
  } else {
    startText.value = buttonText.value.slice(0, location)
    endText.value = buttonText.value.slice(location + (props.shortcutKey as string).length)
  }
}

////////Shortcut Key Implementation////////
const removeEvent = new AbortController()
const route = useRoute()
const router = useRouter()
const store = useAppShortcutKeysStore()
let myKeyId: tAppKeyRecordLocator[]

onMounted(() => {
  if (!hasKey.value) {
    //escape hatch if there is no shortcut key to assign
    return
  }

  const listener = (e: KeyboardEvent) => {
    if (e.key.toUpperCase() === (props.shortcutKey as string).toUpperCase() && e.altKey) {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (props.routeName !== route.name) {
        router.push({ name: props.routeName })
      }
    }
  }
  myKeyId = store.addAppKeys({
    context: 'Menu Item',
    keys: ['Alt', props.shortcutKey as string],
    description: buttonText.value,
  })
  document.addEventListener('keydown', listener, { signal: removeEvent.signal })
})

onUnmounted(() => {
  //console.log(`${buttonText.value} unmounted`)

  if (!hasKey.value) {
    //escape hatch if there is no shortcut key to unassign
    return
  }

  removeEvent.abort()
  store.removeAppKeys(myKeyId)
})
</script>

<template>
  <button
    @click="routeName !== $route.name && $router.push({ name: routeName })"
    :disabled="routeName === $route.name"
  >
    <span v-if="hasKey">
      {{ startText }}<span class="shortcut">{{ shortcutKey }}</span
      >{{ endText }}
    </span>
    <span v-else>
      {{ buttonText }}
    </span>
  </button>
</template>

<style scoped>
.shortcut {
  text-decoration: underline;
  font-weight: bold;
}
</style>
