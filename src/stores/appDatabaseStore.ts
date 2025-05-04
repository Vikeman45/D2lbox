import { ref } from 'vue'
import { defineStore } from 'pinia'
import { openDB, type DBSchema, type IDBPDatabase, type StoreNames } from 'idb'
import { getGameData, type APIStoreNames } from '@/helpers/getGameData'

//###################### Store Definition ######################//
export const useAppDatabaseStore = defineStore('appDatabase', () => {
  //###### State ######//
  const dbStatus = ref('closed')
  const dbIsOpen = ref(false)
  const dbMayBeStale = ref(true)

  /** The connection object for the indexedDB database */
  let appDB: IDBPDatabase<IAppDB>
  initializeDB()

  // //##### Getters #####//
  /** Return an array of records from the database. You can optionally specify
   *  the specific keys that you want returned from the records.
   *
   *  @param store       The object name (store) of the dataset to retrieve
   *                     from the database
   *  @param [someKeys]  An optional array of explicit keys to retrieve from
   *                     each record. If omitted, all fields of the record will
   *                     be returned
   */
  async function getData<
    S extends StoreNames<IAppDB>,
    T extends IAppDB[S]['value'],
    K extends keyof T,
    Keep extends K[],
    Filtered extends Pick<T, Keep[number]>,
  >(store: S, someKeys?: Keep): Promise<Filtered[]> {
    const data = await appDB.getAll(store) // retrieve from "database"
    return data.map(
      // loop over the array of records
      (record) =>
        Object.fromEntries(
          typedEntries(record).filter(([k, _v]) => {
            // loop over record fields
            if (someKeys) {
              // if specific keys are requested
              return someKeys.includes(k as K) // return this key if requested
            } else {
              // otherwise
              return true // return all keys
            }
          }),
        ),
    )
  }

  //##### Actions #####//
  /** Action description... */
  async function initializeDB() {
    // Open the database (if it exists)
    console.time('open database')
    appDB = await openDB<IAppDB>('TCTD2lbox_App', 1, {
      // otherwise create the database
      async upgrade(db) {
        dbStatus.value = 'initializing...'
        console.log('...creating App database')
        db.createObjectStore('appColors', { keyPath: 'id' }).createIndex('byCategory', 'category', {
          unique: true,
        })

        db.createObjectStore('appData')

        db.createObjectStore('appDisplayTypes', { keyPath: 'id' }).createIndex('byType', 'type', {
          unique: true,
        })

        const dict = db.createObjectStore('dictionary', { keyPath: 'id' })
        dict.createIndex('byCategory', 'category')
        dict.createIndex('byCode', 'codeName')
        dict.createIndex('byPretty', 'prettyName')

        db.createObjectStore('lastFetch', { keyPath: 'store' })

        db.createObjectStore('gearAttributes', { keyPath: 'id' })

        db.createObjectStore('gearBrands', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('gearModAttributes', { keyPath: 'id' })

        const gModels = db.createObjectStore('gearModels', { keyPath: 'id' })
        gModels.createIndex('byName', 'name', { unique: true })
        gModels.createIndex('bySlot', 'slot')

        db.createObjectStore('gearQuality', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('gearSlots', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('gearTalents', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('skillMods', { keyPath: 'id' })

        db.createObjectStore('skillPlatforms', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('skillSlots', { keyPath: 'id' }).createIndex('byName', 'name')

        const sVar = db.createObjectStore('skillVariants', { keyPath: 'id' })
        sVar.createIndex('byName', 'name')
        sVar.createIndex('byPlatform', 'platform')

        db.createObjectStore('specializations', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('storage', { keyPath: 'id' })

        db.createObjectStore('watchAttributes', { keyPath: 'id' })

        db.createObjectStore('weaponAttributes', { keyPath: 'id' })

        db.createObjectStore('weaponClass', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        const wepModels = db.createObjectStore('weaponModels', { keyPath: 'id' })
        wepModels.createIndex('byName', 'name', { unique: true })
        wepModels.createIndex('byClass', 'class')

        const wepMods = db.createObjectStore('weaponMods', { keyPath: 'id' })
        wepMods.createIndex('byName', 'name')
        wepMods.createIndex('bySlot', 'slot')
        wepMods.createIndex('byType', 'type', { multiEntry: true })

        db.createObjectStore('weaponQuality', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('weaponSubClass', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        db.createObjectStore('weaponTalents', { keyPath: 'id' }).createIndex('byName', 'name', {
          unique: true,
        })

        await stockDB(db)
        dbStatus.value = 'ready'
        dbMayBeStale.value = false
      },
    })
    console.timeEnd('open database')

    dbIsOpen.value = true

    if (dbStatus.value === 'closed') {
      dbStatus.value = 'ready'
      verifyFreshness()
    }
  }

  //###################### Private Functions #####################//
  async function verifyFreshness() {
    const lastUpdated = getGameData('lastUpdated')
    const needsUpdating = [] as APIStoreNames[]

    console.time('DB getAll')
    const lastFetch = {} as { [key in APIStoreNames]: number }
    ;(await appDB.getAll('lastFetch')).forEach((s) => (lastFetch[s.store] = s.lastFetch))

    console.timeEnd('DB getAll')
    ;(await lastUpdated).lastUpdated.data.forEach((s) => {
      if (s.updated > lastFetch[s.store]) {
        needsUpdating.push(s.store)
      }
    })
    console.log(needsUpdating)

    if (needsUpdating.length > 0) {
      const freshness = needsUpdating.map((key) => lastFetch[key])
      const updates = await getGameData(needsUpdating, freshness)
      console.log(updates)
      const promises = (Object.keys(updates) as APIStoreNames[]).map((key) => {
        console.log(`updating ${key}`)
        if (updates[key].data.length === 0) return null

        const tx = appDB.transaction(['lastFetch', key], 'readwrite')
        updates[key].data.forEach((data) => tx.objectStore(key).put(data))
        tx.objectStore('lastFetch').put({ store: key, lastFetch: updates[key].served })
        return tx.done
      })
      await Promise.all(promises)
    }

    dbMayBeStale.value = false
  }

  async function stockDB(db: IDBPDatabase<IAppDB>) {
    console.log('--> stockDB()')
    console.time('<-- stockDB()')
    const stores = [...db.objectStoreNames]

    const promises = stores.map(async (store) => {
      if (store === 'appData' || store === 'lastFetch') return null
      console.log(`    stocking ${store}...`)

      const temp = await getGameData(store)
      if (temp[store].data.length === 0) return null

      const tx = db.transaction(['lastFetch', store], 'readwrite')
      temp[store].data.forEach((data) => tx.objectStore(store).add(data))
      tx.objectStore('lastFetch').add({ store: store, lastFetch: temp[store].served })
      return tx.done
    })

    await Promise.all(promises)
    console.timeEnd('<-- stockDB()')
  }

  return { dbIsOpen, dbStatus, dbMayBeStale, getData }
})

//############### Type and Interface Definitions ###############//
/** Type description... */
export interface IAppDB extends DBSchema {
  appColors: {
    key: number
    indexes: {
      byCategory: string
    }
    value: {
      /** unique identifier for an appColor record */
      id: number
      /** potentially descriptive use for the color */
      category: string
      /** red component of color (in RGB space) */
      R: number
      /** green component of color (in RGB space) */
      G: number
      /** blue component of color (in RGB space) */
      B: number
      /** hue component of color (in HSL space) */
      H: number
      /** saturation component of color (in HSL space) */
      S: number
      /** lightness component of color (in HSL space) */
      L: number
      /** hexidecimal representation of the fully opaque color (as a string) */
      hex: string
      /** timestamp (Date.now()) of when this record was last changed */
      lastChanged: number
    }
  }
  appData: {
    //####################  Not fed from the API  #################
    key: string
    value: {
      /** the username of the last "known" user of the app on this device */
      lastUser?: string
    }
  }
  appDisplayTypes: {
    key: number
    indexes: {
      byType: string
    }
    value: {
      id: number
      type: string
      suffix?: string
      lastChanged: number
    }
  }
  dictionary: {
    key: number
    indexes: {
      byPretty: string
      byCode: string
      byCategory: number
    }
    value: {
      id: number
      prettyName: string
      codeName: string
      category?: number //foreign key: appColors.id
      displayType: number //foreign key: appDisplayTypes.id
      decimals?: number
      lastChanged: number
    }
  }
  gearAttributes: {
    key: number
    value: {
      id: number //foreign key: dictionary.id
      max: {
        30: number
        40: number
      }
      lastChanged: number
    }
  }
  gearBrands: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      shortName: string
      type?: number //foreign key: gearQuality.id
      bonus?: number //foreign key: gearTalents.id
      buff: [
        null,
        { [index: string]: number } | null,
        { [index: string]: number },
        { [index: string]: number },
        { [index: string]: number } | null,
      ]
      lastChanged: number
    }
  }
  gearModAttributes: {
    key: number
    value: {
      id: number //foreign key: dictionary.id
      max: {
        30: number
        40: number
      }
      lastChanged: number
    }
  }
  gearModels: {
    key: number
    indexes: {
      byName: string
      bySlot: number
    }
    value: {
      id: number
      name: string
      slot: number //foreign key: gearSlots.id
      brand: number //foreign key: gearBrands.id
      type: number //foreign key: gearQuality.id
      core?: number //foreign key: dictionary.id
      mod: boolean
      attr1?: number //foreign key: dictionary.id
      value1?: number
      attr2?: number //foreign key: dictionary.id
      value2?: number
      has3rdAttr: boolean
      talent: number //foreign key: gearTalents.id
      lastChanged: number
    }
  }
  gearQuality: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      armorIndex: number
      cores: number
      attributes: number
      talents: number
      isFixed: boolean
      lastChanged: number
    }
  }
  gearSlots: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      baseArmor: Array<Array<number | null>>
      lastChanged: number
    }
  }
  gearTalents: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      description: string
      gearset?: number //foreign key: gearBrands.id
      slot?: number //foreign key: gearSlots.id
      cooldown?: number
      isStandard: boolean
      is4PcBonus: boolean
      isTeamBuff: boolean
      isOffensive: boolean
      isDefensive: boolean
      isUtility: boolean
      isBuff: boolean
      isMultiplier: boolean
      isAmplifier: boolean
      effect: object
      isImplemented: boolean
      lastChanged: number
    }
  }
  lastFetch: {
    //####################  Not fed from the API  #################
    key: APIStoreNames
    value: {
      store: APIStoreNames
      lastFetch: number
    }
  }
  skillMods: {
    key: number
    value: {
      id: number
      name: string
      platform: number //foreign key: skillPlatforms.id
      slot: number //foreign key: skillSlots.id
      lastChanged: number
    }
  }
  skillPlatforms: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      lastChanged: number
    }
  }
  skillSlots: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      lastChanged: number
    }
  }
  skillVariants: {
    key: number
    indexes: {
      byName: string
      byPlatform: number
    }
    value: {
      id: number
      name: string
      platform: number //foreign key: skillPlatforms.id
      category: number //foreign key: appColors.id
      specialization?: number //foreign key: specializations.id
      capacity?: number
      cooldown?: number
      damage?: number
      duration?: number
      heal?: number
      health?: number
      range?: number
      lastChanged: number
    }
  }
  /**
   * IDB data store for specialization details
   */
  specializations: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      /** id - unique identifier for a specialization record */
      id: number
      /**  */
      name: string
      lastChanged: number
    }
  }
  storage: {
    key: number
    value: {
      id: number
      name: string
      gearSize: number
      modSize: number
      modsAreGear: boolean
      loadable: boolean
      lastChanged: number
    }
  }
  watchAttributes: {
    key: number
    value: {
      id: number //foreign key: dictionary.id
      min?: number
      max?: number
      lastChanged: number
    }
  }
  weaponAttributes: {
    key: number
    value: {
      id: number //foreign key: dictionary.id
      max: {
        30: number
        40: number
      }
      core?: {
        30: number
        40: number
      }
      lastChanged: number
    }
  }
  weaponClass: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      shortName: string
      ammo: number
      lastChanged: number
    }
  }
  weaponModels: {
    key: number
    indexes: {
      byName: string
      byClass: string
    }
    value: {
      id: number
      name: string
      class: number //foreign key: weaponClass.id
      specialialization?: number //foreign key: specializations.id
      isSidearm: boolean
      subClass: number //foreign key: weaponSubClass.id
      type?: number //foreign key: weaponQuality.id
      fixedDamageValue?: number
      coreAttr?: number //foreign key: weaponAttributes.id
      fixedCoreVal?: number
      fixedAttr?: number //foreign key: weaponAttributes.id
      fixedAttributeVal?: number
      defaultTalent?: number //foreign key: weaponTalents.id
      fixedTalent?: number //foreign key: weaponTalents.id
      RPM: number
      magSize: number
      reload: number
      range: number
      maxRange: number
      accuracy: number
      stability: number
      HsD: number
      optic?: string
      magazine?: string
      underbarrel?: string
      muzzle?: string
      baseDamage: Array<Array<number | null>>
      lastChanged: number
    }
  }
  weaponMods: {
    key: number
    indexes: {
      byName: string
      bySlot: string
      byType: string
    }
    value: {
      id: number
      name: string
      slot: string
      type: Array<string>
      specialization?: number //foreign key: specializations.id
      isFixed: boolean
      buff?: { [index: string]: number }
      zomm?: number
      lastChanged: number
    }
  }
  weaponQuality: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      damageIndex: number
      cores: number
      attributes: number
      talents: number
      isFixed: boolean
      lastChanged: number
    }
  }
  weaponSubClass: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      projectilesPerPull: number
      continuousFire: boolean
      damagePerProjectile: number
      interruptableReload: boolean
      lastChanged: number
    }
  }
  weaponTalents: {
    key: number
    indexes: {
      byName: string
    }
    value: {
      id: number
      name: string
      description: string
      cooldown: number
      isOffensive: boolean
      isDefensive: boolean
      isUtility: boolean
      isBuff: boolean
      isMultiplier: boolean
      isAmplifier: boolean
      effDmgMult: number
      buff?: { [index: string]: number }
      isImplemented: boolean
      lastChanged: number
    }
  }
}

type TupleEntry<
  T extends readonly unknown[],
  I extends unknown[] = [],
  R = never,
> = T extends readonly [infer Head, ...infer Tail]
  ? TupleEntry<Tail, [...I, unknown], R | [`${I['length']}`, Head]>
  : R

type ObjectEntry<T extends object> = T extends object
  ? { [K in keyof T]: [K, Required<T>[K]] }[keyof T] extends infer E
    ? E extends [infer K extends string | number, infer V]
      ? [`${K}`, V]
      : never
    : never
  : never

type Entry<T extends object> = T extends readonly [unknown, ...unknown[]]
  ? TupleEntry<T>
  : T extends ReadonlyArray<infer U>
    ? [`${number}`, U]
    : ObjectEntry<T>

function typedEntries<T extends object>(object: T): ReadonlyArray<Entry<T>> {
  return Object.entries(object) as unknown as ReadonlyArray<Entry<T>>
}
