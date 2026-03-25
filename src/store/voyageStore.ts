import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Voyage, VoyageLeg, BunkerEvent, FuelBlend } from '../types'
import { STORAGE_KEY_VOYAGE } from '../constants/defaults'

const makeEmptyVoyage = (vesselId: string): Voyage => ({
  id: uuidv4(),
  name: 'New Voyage',
  vesselId,
  legs: [],
  bunkerEvents: [],
  blendLibrary: [],
})

interface VoyageState {
  voyage: Voyage | null

  // Voyage lifecycle
  initVoyage: (vesselId: string) => void
  updateVoyageMeta: (updates: Partial<Pick<Voyage, 'name' | 'notes'>>) => void
  resetVoyage: (vesselId: string) => void

  // Leg CRUD
  addLeg: (leg: Omit<VoyageLeg, 'id' | 'order'>) => void
  updateLeg: (legId: string, updates: Partial<Omit<VoyageLeg, 'id'>>) => void
  deleteLeg: (legId: string) => void
  reorderLegs: (orderedIds: string[]) => void

  // Bunker events
  addBunkerEvent: (event: Omit<BunkerEvent, 'id'>) => void
  updateBunkerEvent: (eventId: string, updates: Partial<Omit<BunkerEvent, 'id'>>) => void
  deleteBunkerEvent: (eventId: string) => void

  // Blend library
  addBlend: (blend: Omit<FuelBlend, 'id'>) => string
  updateBlend: (blendId: string, updates: Partial<Omit<FuelBlend, 'id'>>) => void
  deleteBlend: (blendId: string) => void

  // Persistence
  exportVoyage: () => string
  importVoyage: (json: string) => void
}

export const useVoyageStore = create<VoyageState>()(
  persist(
    (set, get) => ({
      voyage: null,

      initVoyage: (vesselId) => {
        const { voyage } = get()
        if (!voyage || voyage.vesselId !== vesselId) {
          set({ voyage: makeEmptyVoyage(vesselId) })
        }
      },

      updateVoyageMeta: (updates) =>
        set(s => ({ voyage: s.voyage ? { ...s.voyage, ...updates } : s.voyage })),

      resetVoyage: (vesselId) => set({ voyage: makeEmptyVoyage(vesselId) }),

      addLeg: (leg) => {
        set(s => {
          if (!s.voyage) return s
          const maxOrder = s.voyage.legs.reduce((m, l) => Math.max(m, l.order), 0)
          const newLeg: VoyageLeg = { ...leg, id: uuidv4(), order: maxOrder + 1 }
          return { voyage: { ...s.voyage, legs: [...s.voyage.legs, newLeg] } }
        })
      },

      updateLeg: (legId, updates) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              legs: s.voyage.legs.map(l => (l.id === legId ? { ...l, ...updates } : l)),
            },
          }
        }),

      deleteLeg: (legId) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              legs: s.voyage.legs.filter(l => l.id !== legId),
              bunkerEvents: s.voyage.bunkerEvents.filter(b => b.afterLegId !== legId),
            },
          }
        }),

      reorderLegs: (orderedIds) =>
        set(s => {
          if (!s.voyage) return s
          const reordered = orderedIds
            .map((id, idx) => {
              const leg = s.voyage!.legs.find(l => l.id === id)
              return leg ? { ...leg, order: idx + 1 } : null
            })
            .filter(Boolean) as VoyageLeg[]
          return { voyage: { ...s.voyage, legs: reordered } }
        }),

      addBunkerEvent: (event) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              bunkerEvents: [...s.voyage.bunkerEvents, { ...event, id: uuidv4() }],
            },
          }
        }),

      updateBunkerEvent: (eventId, updates) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              bunkerEvents: s.voyage.bunkerEvents.map(b =>
                b.id === eventId ? { ...b, ...updates } : b
              ),
            },
          }
        }),

      deleteBunkerEvent: (eventId) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              bunkerEvents: s.voyage.bunkerEvents.filter(b => b.id !== eventId),
            },
          }
        }),

      addBlend: (blend) => {
        const id = uuidv4()
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              blendLibrary: [...s.voyage.blendLibrary, { ...blend, id }],
            },
          }
        })
        return id
      },

      updateBlend: (blendId, updates) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              blendLibrary: s.voyage.blendLibrary.map(b =>
                b.id === blendId ? { ...b, ...updates } : b
              ),
            },
          }
        }),

      deleteBlend: (blendId) =>
        set(s => {
          if (!s.voyage) return s
          return {
            voyage: {
              ...s.voyage,
              blendLibrary: s.voyage.blendLibrary.filter(b => b.id !== blendId),
            },
          }
        }),

      exportVoyage: () => JSON.stringify(get().voyage, null, 2),

      importVoyage: (json) => {
        try {
          const data = JSON.parse(json)
          set({ voyage: data })
        } catch {
          throw new Error('Invalid voyage data file')
        }
      },
    }),
    {
      name: `${STORAGE_KEY_VOYAGE}_v1`,
      partialize: (s) => ({ voyage: s.voyage }),
    }
  )
)
