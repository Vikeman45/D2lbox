import { reactive } from 'vue'
import { defineStore } from 'pinia'
import sourceData from '@/data/AppRoutes.json' assert {type: 'json'}

//############### Type and Interface Definitions ###############//
// Type for the menu structure of the application
export type tMenuItemRecord = {
  routeName: string             //the name of the route associated with this record
  descriptor: string            //the description of the route (text to be displayed)
  shortcutKey: string           //the key code to be used for a key event
  children?: tMenuItemRecord[]  //optional array of sub-menu items
}


//################### Store Definition ###################//
export const useMenuStructureStore = defineStore('menuStructure', () => {
  /** Application-level menu creation info */
  const menuItemData = reactive(sourceData as tMenuItemRecord[])

  return { menuItemData }
})