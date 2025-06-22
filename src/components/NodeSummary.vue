<script setup lang="ts">
import { type DataPoint, type RequestData, useAnalyzeUIStore } from '@/stores/analyzeUIStore'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

const theSummary = useTemplateRef('nodeSummary')
const uiData = useAnalyzeUIStore()

// reactive versions of variables from the analyzeUIStore
const { summaryState, requestWaiting } = storeToRefs(uiData)
// const animationCancelled = ref(false)

/** The x-coordinate for the left side of the popover (in pixels) that centers it on the node */
const popoverLeft = ref('0px')
/** The y-coordinate for the top of the popover (in pixels) that centers it on the node */
const popoverTop = ref('0px')
/** The coordinate defining the `transform-origin` for the summary popover */
const rotationAxis = ref('0px 0px')
/** The data from the tree node */
const nodeData = ref<DataPoint>({ damage: 0, method: '???' })

watch(requestWaiting, (request, oldRequest) => {
  if (request && !oldRequest && theSummary.value) {
    summarySetup(request)
    theSummary.value.showPopover()
  }
})

function summarySetup(request: RequestData) {
  /** Hardcoded width of the popover element */
  const popoverWidth = 225
  /** Hardcoded hieght of the popover element */
  const popoverHeight = 110

  // console.log('--> summarySetup(): attaching summary element to the requested graph node')

  popoverLeft.value = `${request.center.cx - popoverWidth / 2}px`
  popoverTop.value = `${request.center.cy - popoverHeight / 2}px`
  rotationAxis.value = `50% ${popoverHeight / 2 + request.axisOffset}px`
  nodeData.value = request.data
}

function togglePopover(e: ToggleEvent) {
  // console.log(`--> togglePopover`)
  if (!theSummary.value) return // escape the event if the popover is not mounted
  if (e.newState === 'open') {
    // console.log('   Summary popover about to open')
    summaryState.value = 'RISING'
  } else {
    // console.log('   Summary popover about to close')
    summaryState.value = 'FALLING'
  }
}

function updateStatus(e: AnimationEvent) {
  // console.log(`⏱️ theSummary's ${e.animationName} animation ended`)
  if (
    e.animationName.includes('fall-backwards') ||
    (summaryState.value === 'FALLING' && theSummary.value?.clientHeight === 0)
  )
    summaryState.value = 'READY'
  if (e.animationName.includes('spring-up')) summaryState.value = 'SHOWING'
}

onMounted(() => {
  // console.log('popover mounted')
  summaryState.value = 'READY'
  if (theSummary.value) {
    theSummary.value.addEventListener('animationend', updateStatus, { passive: true })
    theSummary.value.addEventListener(
      'animationcancel',
      (e: AnimationEvent) => {
        console.warn(`Animation ${e.animationName} cancelled by the browser`)
        updateStatus(e)
      },
      { passive: true },
    )
  }
})
onUnmounted(() => {
  // console.log('popover unmounted')
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
  animation: fall-backwards calc(var(--falldown-duration) * 1s) linear forwards;
}

aside:popover-open {
  animation: spring-up 0.3s cubic-bezier(1, 2.67, 0.79, 0.73) forwards;
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

/* .fall-backwards {
  animation: fall-backwards calc(var(--falldown-duration) * 1s) linear forwards;
} */
</style>
