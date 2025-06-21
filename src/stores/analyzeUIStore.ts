///////////////////////////////////////////////////////////////////////////////////////////////
// Because D3 handles the DOM interaction within the visualization (and not Vue), this store
// acts as the conduit between the two systems to coordinate animation and binding of clicked
// tree nodes in the SVG (D3) and the Vue-generated popover that displays the summary. Several
// actions within the private store (`private-state`) handle the event listeners and animation
// classes for the D3 tree nodes and execute the logic to inform the `analyzeUI` store which
// communicates with Vue component(s) responsible for display of the summary.
///////////////////////////////////////////////////////////////////////////////////////////////

import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

const usePrivateState = defineStore('private-state', () => {
  // using a Set instead of a simple Array to handle the case where a user may click on the same node more than
  // once before it completes its collapse animation
  const pendingRequests = ref<Set<RequestData>>(new Set())
  const activeRequest = ref<RequestData>()
  // const showSummary = ref(false)

  /**
   * Action to kick off animation removing the selected tree node and then trigger summary, if appropriate
   * @param node The selected tree node
   */
  function dropNode(node: SVGGElement) {
    node.classList.add('fall-backwards')

    node.addEventListener(
      'animationend',
      () => {
        node.style.transform = 'rotateX(90deg)' // clean up the node's classes to be ready for
        node.classList.remove('fall-backwards') // future animation

        if (pendingRequests.value.size === 1) {
          // is this the final request (that gets honored)?
          activeRequest.value = pendingRequests.value.values().next().value // then set the active request
          pendingRequests.value.clear() // and empty the request queue
        } else {
          // otherwise, this request is ignored
          restoreNode(node) // reset the node graphic

          // and clear this node from the request queue
          for (const request of pendingRequests.value) {
            if (node === request.node) {
              pendingRequests.value.delete(request)
              break
            }
          }
        }
        if (pendingRequests.value.size === 1) {
          // is this the final request (that gets honored)?
          activeRequest.value = pendingRequests.value.values().next().value // then set the active request
          pendingRequests.value.clear() // and empty the request queue
        } else {
          // otherwise, this request is ignored
          restoreNode(node) // reset the node graphic

          // and clear this node from the request queue
          for (const request of pendingRequests.value) {
            if (node === request.node) {
              pendingRequests.value.delete(request)
              break
            }
          }
        }
      },
      { once: true, passive: true },
    )
  }

  /**
   * Action to show a previously hidden tree node
   * @param node The tree node to restore
   */
  function restoreNode(node: SVGGElement) {
    console.log('restoring node ', node)
    node.classList.add('spring-up')

    node.addEventListener(
      'animationend',
      () => {
        console.log('animation completed on ', node)
        node.style.transform = 'rotateX(0deg)' // clean up the node's classes to be ready for
        node.classList.remove('spring-up') // future animation
      },
      { once: true, passive: true },
    )
  }

  return {
    /** The node on which to attach the summary */
    activeRequest,
    /** Set of pending summary requests (used to handle the case of multiple node clicks prior to presenting the summary) */
    /** Set of pending summary requests (used to handle the case of multiple node clicks prior to presenting the summary) */
    pendingRequests,
    /** Flag to indicate that the summary should be shown */
    // showSummary,

    /**
     * Action to kick off animation removing the selected tree node and then trigger summary, if appropriate
     * @param node The selected tree node
     */
    dropNode,
    /**
     * Action to show a previously hidden tree node
     * @param node The tree node to restore
     */
    restoreNode,
  }
})

export const useAnalyzeUIStore = defineStore('analyzeUI', () => {
  const privateState = usePrivateState()
  const { activeRequest } = storeToRefs(privateState)
  const { dropNode, restoreNode } = privateState
  // const showSummary = computed(() => privateState.showSummary) // rebroadcast from the private store
  const showSummary = ref(false)
  const selectedNode = computed(() => privateState.activeRequest?.node)
  const data = computed(() => privateState.activeRequest?.data)
  const rotationAxisOffset = computed(() => privateState.activeRequest?.axisOffset)
  const position = computed(() => privateState.activeRequest?.center)
  const summaryIsShowing = ref(false)
  const summaryUserDismissed = ref(false)
  const summaryState = ref<SummaryStatus>('UNAVAILABLE')

  watch([summaryState, activeRequest], ([summaryState, activeRequest]) => {
    if (activeRequest && summaryState === 'READY') {
      showSummary.value = true
    }
    if (!activeRequest) showSummary.value = false
  })

  /**
   * Action to communicate that the Summary element was dismissed through user action (pressing `ESC`
   * or clicking off the element) rather than programatically. Kicks off a series of clean-up actions
   * for the state.
   */
  function userDismissedSummary() {
    console.log('picked up user action')
    restoreNode(selectedNode.value!)
    // privateShowSummary.value = false
    showSummary.value = false
    console.log('activeRequest reset')
    privateState.activeRequest = undefined
  }

  /**
   * Action to register a selected tree node for summary and triggers the animation to hide the node.
   * @param nodeData The SVG element, data, position and rotation axis for the requesting tree node
   */
  function requestSummary({ node, data, axisOffset }: NodeData) {
    console.log('Summary requested for node ', node, ' with data ', data)
    privateState.pendingRequests.add({ node, data, axisOffset, center: getNodeCenter(node) })
    privateState.pendingRequests.add({ node, data, axisOffset, center: getNodeCenter(node) })
    dropNode(node)
  }

  /**
   * Action to return the center (cx, cy) of the tree node in pixel coordinates referenced to the page origin
   * @param node The top-level `g` element of the tree node
   * @returns The center coordinates of the tree node
   */
  function getNodeCenter(node: SVGGElement): NodePosition {
    const clientBox = node.getBoundingClientRect()
    return {
      cx: node.scrollLeft + clientBox.x + clientBox.width / 2,
      cy: node.scrollTop + clientBox.y + clientBox.height / 2,
    }
  }

  return {
    /** The data associated with the selected node */
    data,
    /** The center point of the selected tree node or (0,0) if no node is selected */
    position,
    /** The y-axis offset of the axis of rotation from the selected node's center (in pixels) */
    rotationAxisOffset,
    /** The seected node from the tree graph to summarize */
    selectedNode,
    /** Flag to indicate that the summary should be shown */
    showSummary,
    /** Flag to indicate that the summary popover has been dismissed by the user (either pressing `ESC` of clicking outside of the popover) */
    summaryUserDismissed,
    /**  Flag to indicate that the summary is visible (true=visible) */
    summaryIsShowing,
    /** The current status of the summary popover */
    summaryState,

    /**
     * Action to return the center (cx, cy) of the tree node in pixel coordinates referenced to the page origin
     * @param node The top-level `g` element of the tree node
     * @returns The center coordinates of the tree node
     */
    getNodeCenter,
    /**
     * Action to register a selected tree node for summary and triggers the animation to hide the node.
     * @param nodeData The SVG element, data, position and rotation axis for the requesting tree node
     */
    requestSummary,
    /**
     * Action to communicate that the Summary element was dismissed through user action (pressing `ESC`
     * or clicking off the element) rather than programatically. Kicks off a series of clean-up actions
     * for the state.
     */
    userDismissedSummary,
  }
})

///////// Type Daclarations ///////////////////////////////////////////////////
export interface DataPoint {
  /** The cumulative damage */
  damage: number
  /** The node rendering (element layering) method */
  method: string
}

export interface NodePosition {
  /** The x coordinate of the node center */
  cx: number
  /** The y coordinate of the node center */
  cy: number
}

export interface NodeData {
  /** The top-level `g` element for the tree node */
  node: SVGGElement
  /** The data from the tree node to be summarized */
  data: DataPoint
  /** The y-axis offset of the axis of rotation from the selected node's center (in pixels) */
  axisOffset: number
}

export interface RequestData extends NodeData {
  /** The center point of the selected tree node or (0,0) if no node is selected */
  center: NodePosition
}

type SummaryStatus = 'UNAVAILABLE' | 'READY' | 'FALLING' | 'SHOWING'
