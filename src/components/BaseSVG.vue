<script setup lang="ts">
import { useElementSize, watchDebounced } from '@vueuse/core'
import * as d3 from 'd3'
import { useTemplateRef, reactive, onMounted } from 'vue'
import { useAnalyzeUIStore, type DataPoint } from '@/stores/analyzeUIStore'
import { textHeightToRadius, setSpacing } from '@/helpers/treeGraphUtilities'

const uiStore = useAnalyzeUIStore()

///////// Graph Data //////////////////////////////////////////////////////////
const damage = Array(10)
  .fill(0)
  .map((_, i) => 1.05 * i)
const methods = ['pie-under', 'pie-over', 'annulus', 'colored-skull', 'skull-annulus']
const armorFraction = 0.5556 // 0 = grunt, 0.5556 = veteran, 0.7143 = elite, 0.8571 = named
const initialArmor = 9 * armorFraction
const initialHealth = 9 * (1 - armorFraction)

///////// Graph Interactivity /////////////////////////////////////////////////
function nodeClick(this: SVGGElement, e: MouseEvent, data: DataPoint) {
  console.log('Click on: ', data)
  uiStore.requestSummary({
    node: this,
    axisOffset: (7 / 6) * radius,
    data,
  })
  // uiStore.data = data
  // uiStore.setSelectedNode(this)
  // uiStore.rotationAxisOffset = (7 / 6) * radius
  // this.style.transformOrigin = `${horizPos(data.method)}px ${vertPos(data.damage) + (7 / 6) * radius}px`
  // uiStore.summaryEnter(this)
}

///////// Node Placement //////////////////////////////////////////////////////
/** Fundamental size characteristic of the graph - it is the radius of the middle of the outer ring. Total node height/width is 7/3 * radius. */
const radius = textHeightToRadius('XX.XX', 24)
/** Reference to the overall SVG container */
const theSVG = useTemplateRef<SVGSVGElement>('theSVG')
/** Reactive size of the SVG container */
const svgSize = reactive(useElementSize(theSVG, undefined, { box: 'border-box' }))
// vertical positioning is allowed to run nodes out the bottom of the SVG window
/** Vertical scale to convert graph data to SVG coordinates */
const vertPos = setSpacing(damage, 10, 20, (7 / 3) * radius)
// horizontal spacing is adjusted whenever the SVG window changes size
/** Horizontal scale to convert graph data to SVG coordinates */
let horizPos = d3.scaleBand(methods, [0, 1000]).paddingInner(0.1).paddingOuter(0.5).align(1)
watchDebounced(
  svgSize,
  () => {
    console.log(`svg is ${svgSize.width} x ${svgSize.height}`)
    horizPos = d3
      .scaleBand(methods, [0, svgSize.width])
      .paddingInner(0.1)
      .paddingOuter(0.5)
      .align(1)
    renderView()
  },
  {
    debounce: 500,
    maxWait: 1500,
  },
)

///////// Drawing the Graph ///////////////////////////////////////////////////
//#region
function renderView() {
  d3.select('#graph-view')
    .selectAll('g.method-column')
    .data(methods, (_, i) => methods[i])
    .join('g')
    .attr('class', 'method-column')
    .selectAll<SVGGElement, DataPoint>('g.node-group')
    .data((method) =>
      damage.map((dmg) => {
        return { method: method, damage: dmg }
      }),
    )
    .join('g')
    .attr('class', 'node-group')
    .classed('dead', (d) => d.damage >= initialArmor + initialHealth)
    .on('click', nodeClick)
    .style(
      'transform-origin',
      (d) => `${horizPos(d.method)}px ${vertPos(d.damage) + (7 / 6) * radius}px`,
    )
    .each(placeNodeSubElements)

  placeBullets()
}

/**
 * Handle the layering of the different sub-elements. In the function, `this` is the node element (`g`) being populated.
 * @param data The datum from the parent element
 */
function placeNodeSubElements(this: SVGGElement, data: DataPoint) {
  const elementFunctions = [placePie, placeSkull, placeRings, placeText, placeHitBox]
  let order = [0, 1, 2, 3, 4]

  if (
    data.method === 'pie-over' ||
    data.method === 'colored-skull' ||
    data.method === 'skull-annulus'
  )
    order = [1, 0, 2, 3, 4]

  order.forEach((i) => elementFunctions[i](this, data))
}

/**
 * Adds the skull symbol to the element stack.
 * @param selection The selection (parent `g`) to append this element
 * @param data The datum from the parent element
 */
function placeSkull(selection: SVGGElement, data: DataPoint) {
  d3.select(selection)
    .selectAll('use.node-skull')
    .data([data.damage])
    .join('use')
    .attr('href', (d) => (d < initialArmor + initialHealth ? '#skull-node' : '#dead-skull-node'))
    .attr('class', 'node-skull')
    .attr('width', (7 / 3) * radius)
    .attr('height', (7 / 3) * radius)
    .attr('x', horizPos(data.method) ?? 0)
    .attr('y', vertPos(data.damage))
}

/**
 * Adds the text to the element stack. Positioning (`x` and `y`) are handled by the `tranfsorm` on the parent `g`.
 * @param {d3.selection} selection The selection (parent `g`) to append this element
 * @param {{damage: number, method: string}} data The datum from the parent element
 */
function placeText(selection: SVGGElement, data: DataPoint) {
  // console.log('...placing text')

  d3.select(selection)
    .selectAll('text.node-text')
    .data([data.damage])
    .join('text')
    .attr('class', 'damage-fill damage-size node-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text((d) => d.toFixed(2))
    .attr('x', horizPos(data.method) ?? 0)
    .attr('y', vertPos(data.damage))
}
/**
 * Adds a transparent "hit box" over the element stack to facilitate selecting the node. This handles issues with transparency
 * within the element stack and also allows defining a larger radius for node selection. Positioning (`x` and `y`) are handled
 * by the `tranfsorm` on the parent `g`.
 * @param {d3.selection} selection The selection (parent `g`) to append this element
 * @param {{damage: number, method: string}} data The datum from the parent element
 */
function placeHitBox(selection: SVGGElement, data: DataPoint) {
  // console.log('...placing hit box')
  const buffer = 10 // how much laarger than the radius of the element to extend
  if (typeof data.method !== 'string') return

  d3.select(selection)
    .selectAll('circle.node-hitbox')
    .data([data.damage])
    .join('circle')
    .attr('class', 'node-hitbox')
    .attr('r', (7 / 6) * radius + buffer)
    .attr('fill', 'transparent')
    .attr('cx', horizPos(data.method) ?? 0)
    .attr('cy', vertPos(data.damage))
}

/**
 * Adds the rings symbol to the element stack. Positioning (`x` and `y`) are handled by the `tranfsorm` on the parent `g`.
 * @param {d3.selection} selection The selection (parent `g`) to append this element
 * @param {{damage: number, method: string}} data The datum from the parent element
 */
function placeRings(selection: SVGGElement, data: DataPoint) {
  d3.select(selection)
    .selectAll('use.node-rings')
    .data([data.damage])
    .join('use')
    .attr('href', '#rings')
    .attr('class', 'node-rings')
    .attr('width', (7 / 3) * radius)
    .attr('height', (7 / 3) * radius)
    .attr('x', horizPos(data.method) ?? 0)
    .attr('y', vertPos(data.damage))
}

/**
 * Adds the pie chart to the element stack. Positioning (`x` and `y`) are handled by the `tranfsorm` on the parent `g`.
 * @param selection The selection (parent `g`) to append this element
 * @param data The datum from the parent element
 */
function placePie(selection: SVGGElement, data: DataPoint) {
  // console.log('...placing pie')
  type Datum = number
  const sliceColors = ['transparent', 'var(--pie-armor)', 'var(--pie-health)']
  const damageSlices: Datum[] = [
    data.damage,
    Math.max(initialArmor - data.damage, 0),
    Math.max(Math.min(initialHealth + initialArmor - data.damage, initialHealth), 0),
  ]
  const pieData = d3.pie<Datum>().sort(null)(damageSlices)
  //console.log(pieData)

  const arcGenerator = d3
    .arc<d3.PieArcDatum<Datum>>()
    .innerRadius(data.method === 'annulus' ? radius : 0)
    .outerRadius((7 / 6) * radius)

  const pieG = d3
    .select(selection)
    .selectAll('g.pie-group')
    .data([data.damage])
    .join('g')
    .attr('class', 'pie-group')
    .attr('transform', `translate(${horizPos(data.method)},${vertPos(data.damage)})`)

  pieG
    .selectAll('path.pie-slice')
    .data(pieData, (_, i) => ['damage', 'armor', 'health'][i])
    .join(
      (enter) => enter.append('path').attr('class', 'pie-slice'),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('d', arcGenerator)
    .attr('fill', (_, i) => sliceColors[i])

  if (data.method === 'colored-skull') pieG.attr('clip-path', 'url(#clip-skull')
  if (data.method === 'skull-annulus') pieG.attr('clip-path', 'url(#clip-skull-with-ring')
}

/**
 * Adds the bullet symbol to the element stack. Positioning (`x` and `y`) are handled by the `tranfsorm` on the parent `g`.
 * @param {d3.selection} _selection The selection (parent `g`) to append this element
 * @param {{damage: number, method: string}} data The datum from the parent element
 */
function placeBullets() {
  const data = methods.flatMap((method) =>
    damage.map((dmg) => {
      return {
        method: method,
        damage: dmg,
        angle: ((45 - (dmg / 9.45) * 90) / 360) * 2 * Math.PI,
      }
    }),
  )
  //console.log(data)
  const length = 150

  d3.select('#graph-view')
    .selectAll('g.links')
    .data([1])
    .join('g')
    .attr('class', 'links')
    .selectAll('line.bullet')
    .data(data)
    .join(
      (enter) =>
        enter
          .append('line')
          .attr('class', 'bullet')
          .attr('marker-start', 'url(#bullet)')
          .attr('stroke', 'black')
          .attr('stroke-width', 2),
      (update) => update,
    )
    .attr('x1', (d) => (horizPos(d.method) ?? 0) - radius * Math.cos(d.angle))
    .attr('y1', (d) => vertPos(d.damage) + radius * Math.sin(d.angle))
    .attr('x2', (d) => (horizPos(d.method) ?? 0) - (radius + length) * Math.cos(d.angle))
    .attr('y2', (d) => vertPos(d.damage) + (radius + length) * Math.sin(d.angle))
}
//#endregion

onMounted(() => {
  if (theSVG.value) {
    const svg = d3.select(theSVG.value)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        svg.select('#graph-view').attr('transform', event.transform)
      })
    svg.call(zoom)
  }
})
</script>

<template>
  <svg
    ref="theSVG"
    id="theSVG"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <defs>
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <!---- Bullet Marker Definitions ----------------------------------------------------------------------------------------------------------------->
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <marker
        id="bullet"
        markerWidth="1000"
        markerHeight="320"
        refX="1000"
        refY="160"
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <svg
          id="streaky-bullet"
          width="1000"
          height="320"
          overflow="visible"
          preserveAspectRatio="xMaxYMid meet"
          viewBox="0 0 1000 320"
        >
          <linearGradient
            id="bulletGradient"
            x1="50%"
            x2="50%"
            y1="-33%"
            y2="133%"
            gradientUnits="objectBoundingBox"
          >
            <stop stop-color="#7d7d7d" offset="0" />
            <stop stop-color="#323232" offset=".4531" />
            <stop offset=".75" />
          </linearGradient>
          <linearGradient
            id="glintGradient"
            x1="100%"
            x2="0%"
            y1="50%"
            y2="50%"
            gradientUnits="objectBoundingBox"
          >
            <stop stop-color="#fff" stop-opacity=".2" offset="0" />
            <stop stop-color="#fff" offset=".64448" />
          </linearGradient>
          <linearGradient
            id="streakGradient"
            x1="1.1111"
            x2="650"
            y1="160"
            y2="160"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#b3b3b3" stop-opacity=".25" offset="0" />
            <stop stop-color="#b3b3b3" stop-opacity=".8" offset="1" />
          </linearGradient>
          <g>
            <path id="primary-streak" d="m650 122.5s-1460 37.5 0 75z" fill="url(#streakGradient)" />
            <path
              id="projectile"
              d="m670 85h50c160 0 280 52.5 280 75s-120 75-280 75h-50a25 75 0 1 1 0-150z"
              fill="url(#bulletGradient)"
            />
            <path
              id="glint"
              d="m650 123h50c121.49 0 207.94 12.592 300 38"
              fill="none"
              opacity=".5"
              stroke="url(#glintGradient)"
              stroke-width="15"
            />
            <path
              id="radial-streaks"
              d="m650 78-220-50m207 74-404-28m404 144-404 28m417-4-220 50"
              opacity=".8"
              stroke-width="15"
            />
          </g>
        </svg>
      </marker>
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <!---- Node Symbol Definitions ------------------------------------------------------------------------------------------------------------------->
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <symbol id="skull-node" overflow="visible" viewBox="0 0 210 210">
        <path
          id="skull"
          fill="#d9d9d9"
          stroke="none"
          d="M -51,15 c -13,0 -10,17 -2,23 6,5 16,0 23,3 4,1 4,8 4,12 1,26 4,22 26,22 22,0 24,5 24,-21 0,-5 4,-9 8,-12 5,-4 10,1 16,-1 10,-4 19,-25 4,-25 0,-22 11,-48 -4,-68 -22,-34 -85,-30 -101,8 -8,19 2,40 2,59 m 12,-20 c 11,-3 43,17 22,23 -7,2 -17,5 -23,0 -5,-5 -8,-21 1,-23 m 48,17 c 1,-6 18,-15 24,-17 16,-3 15,24 2,27 -23,0 -26,-8 -26,-10 z m 0,29 c -2,4 -5,-1 -9,-1 -4,0 -6,4 -9,2 -5,-4 6,-26 13,-14 3,4 5,13 5,13 z"
        />
      </symbol>
      <symbol id="dead-skull-node" overflow="visible" viewBox="0 0 210 210">
        <g transform="rotate(15)">
          <path
            id="skull"
            fill="#d9d9d9"
            stroke="none"
            d="M -51,15 c -13,0 -10,17 -2,23 6,5 16,0 23,3 4,1 4,8 4,12 1,26 4,22 26,22 22,0 24,5 24,-21 0,-5 4,-9 8,-12 5,-4 10,1 16,-1 10,-4 19,-25 4,-25 0,-22 11,-48 -4,-68 -22,-34 -85,-30 -101,8 -8,19 2,40 2,59 m13-5c11-3 36-0 16 2-8 1-10 1-18 1-5-5-7-1 2-3m47 2c1-6 12 1 18-1 16-3 18 0 5 3-23 1-23 0-23-2zm0 29c-2 4-5-1-9-1s-6 4-9 2c-5-4 6-26 13-14 3 4 5 13 5 13zm7-65-3-2-6 4-2-1-4-8v-1-8l2-3 5-3 3 2 7 1v4l4 5-1 2s-3 8-3 8z"
          />
          <path
            stroke=" #f00"
            stroke-linecap="round"
            stroke-width="8"
            d="M-41,-5 -13,22 M -15,-8 -40,26 M 18,-2 34,31 M 42,3 10,26"
          />
        </g>
      </symbol>
      <symbol id="rings" overflow="visible" viewBox="0 0 210 210">
        <circle
          class="ring outer-ring"
          cx="0"
          cy="0"
          r="90"
          stroke="oklch(85% 0 0)"
          stroke-width="10"
          fill="none"
        />
        <circle
          class="ring middle-ring"
          cx="0"
          cy="0"
          r="90"
          stroke="oklch(0% 0 0)"
          stroke-width="7"
          fill="none"
        />
        <circle
          class="ring inner-ring"
          cx="0"
          cy="0"
          r="90"
          stroke="oklch(0.73 0.1684 53.17)"
          stroke-width="4"
          fill="none"
        />
        <g
          class="crosshairs"
          fill="none"
          stroke="var(--division-orange)"
          stroke-width="10"
          opacity="var(--crosshair-visibility)"
        >
          <circle cx="0" cy="0" r="90" />
          <path d="M 0,-105 v 40 M 105,0 h -40 M 0,105 v -40 M -105,0 h 40" />
          <circle id="center-dot" cx="0" cy="0" r="5" fill="var(--division-orange)" stroke="none" />
        </g>
      </symbol>
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <!---- Clip Path Definitions -------------------------------------------------------------------------------------------------------------------->
      <!------------------------------------------------------------------------------------------------------------------------------------------------>
      <clipPath id="clip-skull" clipPathUnits="objectBoundingBox">
        <path
          d="M -51,15 c -13,0 -10,17 -2,23 6,5 16,0 23,3 4,1 4,8 4,12 1,26 4,22 26,22 22,0 24,5 24,-21 0,-5 4,-9 8,-12 5,-4 10,1 16,-1 10,-4 19,-25 4,-25 0,-22 11,-48 -4,-68 -22,-34 -85,-30 -101,8 -8,19 2,40 2,59 m 12,-20 c 11,-3 43,17 22,23 -7,2 -17,5 -23,0 -5,-5 -8,-21 1,-23 m 48,17 c 1,-6 18,-15 24,-17 16,-3 15,24 2,27 -23,0 -26,-8 -26,-10 z m 0,29 c -2,4 -5,-1 -9,-1 -4,0 -6,4 -9,2 -5,-4 6,-26 13,-14 3,4 5,13 5,13 z"
        />
      </clipPath>
      <clipPath id="clip-skull-with-ring" clipPathUnits="objectBoundingBox">
        <path
          d="M -51,15 c -13,0 -10,17 -2,23 6,5 16,0 23,3 4,1 4,8 4,12 1,26 4,22 26,22 22,0 24,5 24,-21 0,-5 4,-9 8,-12 5,-4 10,1 16,-1 10,-4 19,-25 4,-25 0,-22 11,-48 -4,-68 -22,-34 -85,-30 -101,8 -8,19 2,40 2,59 m 12,-20 c 11,-3 43,17 22,23 -7,2 -17,5 -23,0 -5,-5 -8,-21 1,-23 m 48,17 c 1,-6 18,-15 24,-17 16,-3 15,24 2,27 -23,0 -26,-8 -26,-10 z m 0,29 c -2,4 -5,-1 -9,-1 -4,0 -6,4 -9,2 -5,-4 6,-26 13,-14 3,4 5,13 5,13 z"
        />
        <path
          fill-rule="evenodd"
          d="M 105 0 A 105 105 0 1 0 -105 0 A 105 105 0 1 0 105 0 M 90 0 A 90 90 0 1 1 -90 0 A 90 90 0 1 1 90 0 Z"
        />
      </clipPath>
    </defs>
    <g id="graph-view">
      <rect id="armor-background" x="0" y="0" width="1200" height="1200" />
      <rect id="health-background" x="1200" y="0" width="1200" height="1200" />
    </g>
  </svg>
</template>

<style lang="css">
:root {
  /*---- Colors -----------------------------------------------------------------------------------*/
  --division-orange: oklch(0.7 0.2 45); /* Pulled from logo */
  --armor-base: oklch(0.7 0.1637 225); /* compatible tetradic color to Division Orange */
  --health-base: oklch(0.73 0.2722 135); /* compatible tetradic color to Division Orange */
  --pie-armor: var(--armor-base); /* --pie-health: oklch(var(--lightness) var(--chroma) 142.16); */
  --pie-health: oklch(0.7527 0.1983 135);
  --lightness: 0.68;
  --chroma: 0.1637;
  --background-brightness: 0.5;
  /*---- Animation timing constants----------------------------------------------------------------*/
  --falldown-duration: 0.75; /* seconds */
  --use-delay: 1; /* a flag for whether a delay should occur 0=no delay, 1=specified delay
  /*---- Miscellaneous-----------------------------------------------------------------------------*/
  --crosshair-visibility: 0;
  --text-height: 24;
}

#armor-background {
  fill: oklch(var(--lightness) var(--chroma) 225); /* tinkering */
  fill: oklch(0.5772 0.0342 225); /* chosen */
  fill: transparent;
}

#health-background {
  fill: oklch(var(--lightness) var(--chroma) 145); /* tinkering */
  fill: oklch(0.6853 0.02 135); /* chosen */
  fill: transparent;
}

.damage-size {
  font-size: calc(var(--text-height) * 1px);
}

.damage-fill {
  stroke-width: 0;
  stroke: oklch(0.5 0 0);
  text-shadow:
    0px 0px 5px var(--division-orange),
    0px 0px 4px #f8f8f8;
}

text {
  font-family: 'Alfa Slab One', serif;
  font-weight: 400;
  font-style: normal;
  color: black;
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

clipPath {
  scale: calc(1 / 210);
}

.node-group:last-child .node-text {
  opacity: 0;
}

#radial-streaks {
  stroke: oklch(from var(--division-orange) 0.05 c h / 0.4);
}

#streaky-bullet g {
  transform-origin: right center;
  scale: calc(1 / clamp(8, (152 - 4 * var(--text-height)) / 7, 16));
}

#theSVG {
  background-color: oklch(var(--background-brightness) 0.01 225);
  width: 100%;
  height: 100%;
}

.crosshairs {
  transition: opacity 0.3s ease-out;
}

.node-group:hover {
  --crosshair-visibility: 1;
  cursor: help;
}

#theSVG:active,
.node-group:active {
  cursor: all-scroll;
}

@keyframes fall-backwards {
  0% {
    transform: rotateX(0deg);
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

  100% {
    transform: rotateX(90deg);
  }
}

.fall-backwards {
  animation: fall-backwards calc(var(--falldown-duration) * 1s) linear forwards;
}

@keyframes spring-up {
  0% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

.spring-up {
  animation: 0.3s spring-up cubic-bezier(1, 2.67, 0.79, 0.73) forwards;
}
</style>
