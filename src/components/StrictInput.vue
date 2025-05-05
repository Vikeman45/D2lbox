<template>
  <div id="container">
    <p>Current index = {{ currentIndex }}</p>
    <label for="select">Weapon Name</label>
    <div id="user-input" @click="caretManager" :class="{ error: isError }">
      <span id="pre" class="auto-text" @click="caretManager">
        {{ preInput }}
      </span>
      <span
        id="input"
        ref="input"
        contenteditable="true"
        spellcheck="false"
        @input="handleInput"
        @beforeinput="getSelection"
        @click="caretManager"
        @keydown="navigateOptions"
      ></span>
      <span id="post" class="auto-text" @click="caretManager">
        {{ postInput }}
      </span>
    </div>
    <select
      ref="select"
      id="select"
      autocomplete="off"
      tabindex="-1"
      :size="Math.min(15, filteredOptions.length + 1)"
      @change="chooseOption"
    >
      <option disabled>{{ choiceCount }}</option>
      <option v-for="{ name, id } in filteredOptions" :key="id" :value="id">
        {{ name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, nextTick } from 'vue'

const input = ref<HTMLSpanElement | null>(null)
const select = ref<HTMLSelectElement | null>(null)

const props = defineProps<{
  options: {
    name: string
    id: number
  }[]
  prompt?: string
  required?: boolean
  default?: {
    text: string
    value: number
  }
  size?: number
}>()

const userInput = ref('')
const preInput = ref('')
const postInput = ref('')
const currentIndex = ref(-1)
const isError = ref(false)
let oldAnchorOffset = 0
let oldFocusOffset = 0
let oldInput = ''
const filteredOptions = computed(() => {
  return props.options.filter((opt) =>
    opt.name.toUpperCase().includes(userInput.value.toUpperCase()),
  )
})
const choiceCount = computed(() => {
  const numChoices = filteredOptions.value.length
  return `${numChoices} Choice${numChoices > 1 ? 's' : ''}...`
})

watchEffect(() => {
  console.log('--> watchEffect()')
  console.time('<-- watchEffect()')
  console.log(`   updating: option = ${currentIndex.value}, typed = '${userInput.value}'`)
  if (select.value && input.value && currentIndex.value !== -1) {
    const opt = filteredOptions.value[currentIndex.value].name
    const split = opt.toUpperCase().indexOf(userInput.value.toUpperCase())
    preInput.value = opt.substring(0, split)
    getSelection()
    input.value.textContent = opt.substring(split, split + userInput.value.length)
    oldInput = input.value.textContent
    setTimeout(() => restoreSelection(), 0)
    postInput.value = opt.substring(split + userInput.value.length)
    setTimeout(() => {
      if (select.value) {
        select.value.selectedIndex = currentIndex.value + 1
      }
    }, 0)
  } else {
    preInput.value = ''
    postInput.value = ''
    if (select.value) select.value.value = ''
  }
  console.timeEnd('<-- watchEffect()')
})

function isValidOption(option: string) {
  return props.options.some((opt) => opt.name.toUpperCase().includes(option.toUpperCase()))
}

async function restoreSelection() {
  console.log(`   restoring selection [${oldAnchorOffset}, ${oldFocusOffset}]`)
  await nextTick()
  const selection = document.getSelection()
  if (input.value && selection && selection.containsNode(input.value, true)) {
    //selection.removeAllRanges()
    //input.value.focus()
    if (input.value.firstChild) {
      selection.setBaseAndExtent(
        input.value.firstChild,
        oldAnchorOffset,
        input.value.firstChild,
        oldFocusOffset,
      )
    } else {
      selection.setBaseAndExtent(input.value, 0, input.value, 0)
    }
  }
}

function getSelection() {
  console.log('--> getSelection()')
  console.time('<-- getSelection()')
  const me = input.value
  const selection = document.getSelection()

  if (!me || !selection || selection.type === 'None') return

  if (selection.containsNode(me, true)) {
    oldAnchorOffset = selection.anchorOffset
    oldFocusOffset = selection.focusOffset
  }
  console.log(`   captured selection: [${oldAnchorOffset}, ${oldFocusOffset}]`)
  console.timeEnd('<-- getSelection()')
}

function handleInput() {
  console.log(`--> handleInput()`)
  console.time(`<-- handleInput()`)
  //  debugger
  // capture span text
  const request = input.value?.textContent?.replaceAll(String.fromCharCode(160), ' ') // replace no-break spaces with regular spaces
  console.log(`'${request}'`)
  // validate new span text
  if (request != null && isValidOption(request)) {
    // if valid, set old to new
    isError.value = false
    userInput.value = request
    oldInput = request
    currentIndex.value = userInput.value.length > 0 ? 0 : -1
  } else {
    // if invalid, restore old value and cursor position
    if (input.value) {
      isError.value = true
      input.value.textContent = oldInput
      restoreSelection()
    }
  }
  console.timeEnd(`<-- handleInput()`)
}

function caretManager(e: Event) {
  switch ((e.target as Element).id) {
    case 'pre':
      document
        .getSelection()
        ?.setBaseAndExtent(
          input.value?.firstChild ?? (input.value as Node),
          0,
          input.value?.firstChild ?? (input.value as Node),
          0,
        )
      break

    case 'post':
    case 'user-input':
      if (input.value?.firstChild) {
        document
          .getSelection()
          ?.setBaseAndExtent(
            input.value.firstChild,
            input.value.firstChild.textContent?.length ?? 0,
            input.value.firstChild,
            input.value.firstChild.textContent?.length ?? 0,
          )
      } else {
        document.getSelection()?.setBaseAndExtent(input.value as Node, 0, input.value as Node, 0)
      }
      break

    default:
      console.log(e.target)
      break
  }
}

function navigateOptions(e: KeyboardEvent) {
  console.log('--> navigateOptions()')
  console.time('<-- navigateOptions()')
  if (e.key.length > 1) {
    getSelection()
    switch (e.key) {
      case 'Tab':
        break

      case 'ArrowUp':
        e.preventDefault()
        if (e.ctrlKey) {
          currentIndex.value = 0
          break
        }
        if (currentIndex.value === 0) {
          currentIndex.value = filteredOptions.value.length - 1
        } else {
          currentIndex.value--
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (e.ctrlKey) {
          currentIndex.value = filteredOptions.value.length - 1
          break
        }
        if (currentIndex.value === filteredOptions.value.length - 1) {
          currentIndex.value = 0
        } else {
          currentIndex.value++
        }
        break

      case 'Enter':
        break

      // case 'Home': //update for expanded caret
      //   if (!e.shiftKey) {
      //     caretEnd.value = caretStart.value
      //   }
      //   break

      // case 'End': //update for expanded caret
      // case 'PageDown':
      //   caretEnd.value = userInput.value.length
      //   if (!e.shiftKey) {
      //     caretStart.value = caretEnd.value
      //   }
      //   break
    }
    restoreSelection()
  }
  console.timeEnd('<-- navigateOptions()')
}

function chooseOption(e: Event) {
  console.log(`--> chooseOption()`)
  console.time(`<-- chooseOption()`)
  if (select.value) {
    console.log(`***Select Event: value = ${select.value.selectedOptions[0].text}
    selectedIndex = ${select.value.selectedIndex}
    isTrusted = ${e.isTrusted}`)
    currentIndex.value = select.value.selectedIndex - 1
  }
  console.timeEnd(`<-- chooseOption()`)
}
</script>

<style scoped>
#container {
  position: relative;
}

#user-input {
  font: inherit;
  background-color: white;
  color: black;
  caret-color: auto;
  width: 285px;
  height: 30px;
  padding: 2px 5px 2px 5px;
}

select {
  width: 285px;
  visibility: hidden;
  position: absolute;
  z-index: 1;
}

#container:focus-within select {
  visibility: visible;
}

[contenteditable],
select {
  outline: 0px solid transparent;
}

#container:focus-within .auto-text {
  color: rgb(210, 210, 210);
}

.error {
  background-color: yellow;
}
</style>
