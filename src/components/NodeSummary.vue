<script setup lang="ts">
import { type DataPoint, useAnalyzeUIStore } from '@/stores/analyzeUIStore'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

const theSummary = useTemplateRef('nodeSummary')
const uiData = useAnalyzeUIStore()

/** Hardcoded width of the popover element */
const popoverWidth = 225
/** Hardcoded hieght of the popover element */
const popoverHeight = 110
/** The x-coordinate for the left side of the popover (in pixels) that centers it on the node */
const popoverLeft = ref('0px')
/** The y-coordinate for the top of the popover (in pixels) that centers it on the node */
const popoverTop = ref('0px')
// reactive versions of variables from the analyzeUIStore
const { showSummary, summaryIsShowing, summaryState } = storeToRefs(uiData)
// import actions
const { userDismissedSummary } = uiData
/** The coordinate defining the `transform-origin` for the summary popover */
const rotationAxis = ref('0px 0px')
/** The data from the tree node */
const nodeData = ref<DataPoint>({ damage: 0, method: '???' })

watch(showSummary, (newVal, oldVal) => {
  if (oldVal !== newVal) {
    if (newVal) {
      console.log('triggered to show popover')
      theSummary.value?.showPopover()
    } else {
      if (
        theSummary.value?.matches(':popover-open') &&
        !theSummary.value.matches('fall-backwards')
      ) {
        console.log('triggered to hide popover')
        theSummary.value?.hidePopover()
      }
      console.log('the popover is already hidden')
    }
    console.log('watcher on showSummary triggered with no change in value')
  }
})

function togglePopover(e: ToggleEvent) {
  console.log(`Entering handleToggle`)
  if (!theSummary.value) return void 0 // escape the event if the popover is not mounted
  if (e.newState === 'open') {
    console.log('Summary popover about to open')
    popoverLeft.value = `${(uiData.position?.cx ?? 0) - popoverWidth / 2}px`
    popoverTop.value = `${(uiData.position?.cy ?? 0) - popoverHeight / 2}px`
    rotationAxis.value = `50% ${popoverHeight / 2 + (uiData.rotationAxisOffset ?? 0)}px`
    nodeData.value = uiData.data ?? { damage: 0, method: '???' }
    summaryIsShowing.value = true
    summaryState.value = 'SHOWING'
  } else {
    console.log('closing popover')
    theSummary.value.addEventListener(
      'animationend',
      () => {
        console.log('fall-backwards animation ended on the Summary')
        if (showSummary) {
          console.log('communicating user action back to analyzeUIStore')

          userDismissedSummary()
        }
        summaryIsShowing.value = false
        summaryState.value = 'READY'
      },
      { once: true, passive: true },
    )
    summaryState.value = 'FALLING'
    theSummary.value.classList.add('fall-backwards')
  }
}

onMounted(() => {
  console.log('popover mounted')
  summaryState.value = 'READY'
})
onUnmounted(() => {
  console.log('popover unmounted')
  summaryState.value = 'UNAVAILABLE'
})
</script>

<template>
  <aside popover id="nodeSummary" ref="nodeSummary" @beforetoggle.passive="togglePopover">
    <table>
      <thead>
        <tr>
          <th colspan="2">Summary for Bullet {{ nodeData.damage / 1.05 }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(value, key) in nodeData" :key="key">
          <td>{{ key }}:</td>
          <td>{{ typeof value === 'number' ? value.toFixed(2) : value }}</td>
        </tr>
      </tbody>
    </table>
  </aside>
</template>

<style lang="css" scoped>
aside {
  position: absolute;
  inset: unset;
  padding: 0;
  border: 1px solid black;
  left: v-bind('popoverLeft');
  top: v-bind('popoverTop');
  transform-origin: v-bind('rotationAxis');
  animation: fall-backwards var(--falldown-duration) linear forwards;
}

table {
  border-collapse: collapse;
  width: 225px;
  height: 110px;
}

thead {
  background-color: black;
  color: var(--division-orange);
}

th,
td {
  padding: 5px 9px;
}

tbody {
  color: var(--main-text-color);
}

tbody tr:nth-child(odd) {
  background-color: oklch(from var(--nav-bg-color) calc(l + 0.075) c h);
}
tbody tr:nth-child(even) {
  background-color: oklch(from var(--nav-bg-color) calc(l - 0.075) c h);
}
tbody td:first-of-type {
  text-align: right;
}
tbody td:last-of-type {
  text-align: left;
}

aside:popover-open {
  animation: spring-up 0.3s cubic-bezier(1, 2.67, 0.79, 0.73) forwards;
}

ul {
  list-style: none;
}

@keyframes fall-backwards {
  0% {
    transform: rotateX(0deg);
    display: block;
  }

  12% {
    transform: rotateX(9.9deg);
  }

  24% {
    transform: rotateX(39.6deg);
  }

  36% {
    transform: rotateX(88.2deg);
  }

  54% {
    transform: rotateX(67.5deg);
  }

  74% {
    transform: rotateX(88.2deg);
  }

  82% {
    transform: rotateX(84.6deg);
  }

  92% {
    transform: rotateX(89.1deg);
  }

  96% {
    transform: rotateX(88.2deg);
  }

  99% {
    opacity: 1;
  }

  100% {
    transform: rotateX(90deg);
    opacity: 0;
    display: none; /* technically, not required */
  }
}

@keyframes spring-up {
  0% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

.fall-backwards {
  animation: calc((var(--falldown-duration) - 0.05) * 1s) fall-backwards forwards;
}
</style>
