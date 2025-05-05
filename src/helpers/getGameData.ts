import type { StoreNames, StoreValue } from 'idb'
import type { IAppDB } from '@/stores/appDatabaseStore'

const d2DataUrl =
  'https://script.google.com/macros/s/AKfycbwYVxIgMyWA9WsvHen7C823cxOIkr5wiMX11IqgDzPcQOeb79dJ0g0jmlo_P1PuebQ1/exec'

export type NonAPIStoreNames = 'appData' | 'lastFetch'

export type APIStoreNames = Exclude<StoreNames<IAppDB>, NonAPIStoreNames>

type D2APIReplyForOne<GDO extends APIStoreNames> = {
  [key in APIStoreNames]: {
    served: number
    data: StoreValue<IAppDB, GDO>[]
  }
}

type D2APIReplyForMany<GDO extends Array<APIStoreNames>> = {
  [key in GDO[number]]: {
    served: number
    data: StoreValue<IAppDB, key>[]
  }
}

type D2APIReply<GDO> = GDO extends APIStoreNames
  ? D2APIReplyForOne<GDO>
  : GDO extends APIStoreNames[]
    ? D2APIReplyForMany<GDO>
    : GDO extends 'lastUpdated'
      ? {
          lastUpdated: {
            served: number
            data: { store: APIStoreNames; updated: number }[]
          }
        }
      : never

type ValidD2APIResponse<GDO> = {
  status: 200 | 206
  message: string
  time: number
  reply: D2APIReply<GDO>
}

type D2APIResponse<GDO> =
  | {
      status: 400
      message: string
    }
  | ValidD2APIResponse<GDO>

async function getGameData<GDO extends APIStoreNames | APIStoreNames[] | 'lastUpdated'>(
  requestedObjects: GDO,
  freshness?: number | number[],
): Promise<D2APIReply<GDO>> {
  console.log('    -->getGameData()')

  const objectsToFetch = Array.isArray(requestedObjects) ? requestedObjects : [requestedObjects]
  if (freshness !== undefined) {
    freshness = Array.isArray(freshness) ? freshness : [freshness]
    if (freshness.length !== objectsToFetch.length) {
      throw new SyntaxError(
        `If provided, the length of 'freshness' must match the length of 'requestedObjects'.`,
      )
    }
  }
  const responses = await Promise.all(
    objectsToFetch.map(async (obj, i) => {
      const fetchTime = Date.now()
      console.log(`       Fetching ${obj}...`)
      const raw = await fetch(
        `${d2DataUrl}?obj=${obj}${freshness !== undefined ? `&freshness=${(freshness as number[])[i]}` : ''}`,
      )
      const response = (await raw.json()) as D2APIResponse<GDO>
      if (response.status === 400) {
        throw new SyntaxError(`Invalid API request: ${response.message}`)
      }

      if (response.status === 206) {
        console.warn(`⚠️ Check API request: ${response.message}`)
      }

      console.log(
        `       ...${Date.now() - fetchTime}ms to retrieve ${obj} (${response.time}ms API generation)`,
      )

      return response.reply
    }),
  )
  let returnObject = responses[0]
  responses.forEach((obj) => (returnObject = { ...returnObject, ...obj }))
  return returnObject
}

export { getGameData }
