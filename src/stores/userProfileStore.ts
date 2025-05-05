import { ref } from 'vue'
import { defineStore } from 'pinia'

//###################### Store Definition ######################//
export const useUserProfileStore = defineStore('userProfile', () => {
  //###### State ######//
  /** Name of the current user (if known) */
  const userName = ref('')
  /** The platform for the current user */
  const platform = ref('' as tGamePlatform | null)
  /** The player's current character level */
  const userLevel = ref(40)

  //##### Getters #####//
  /** Getter description... */
  //const someGetter = computed(() => /*...*/)

  //##### Actions #####//
  /** Action description... */
  //function someAction(param) {

  //}

  return { userName, platform, userLevel }
})

//############### Type and Interface Definitions ###############//
/** Type for allowable platform types */
export type tGamePlatform = 'XBox' | 'Playstation' | 'PC'
