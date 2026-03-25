import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Vessel, Tank, FuelGrade } from '../types'
import { DEFAULT_FUEL_GRADES } from '../constants/fuelGrades'
import {
  STORAGE_KEY_VESSELS,
  STORAGE_KEY_ACTIVE_VESSEL,
  STORAGE_KEY_FUEL_GRADES,
} from '../constants/defaults'

interface VesselState {
  vessels: Vessel[]
  activeVesselId: string | null
  fuelGrades: FuelGrade[]

  // Vessel CRUD
  addVessel: (name: string, imoNumber?: string) => string
  updateVessel: (id: string, updates: Partial<Omit<Vessel, 'id' | 'tanks'>>) => void
  deleteVessel: (id: string) => void
  setActiveVessel: (id: string) => void
  getActiveVessel: () => Vessel | null

  // Tank CRUD (on active vessel)
  addTank: (tank: Omit<Tank, 'id' | 'consumptionOrder'>) => void
  updateTank: (tankId: string, updates: Partial<Omit<Tank, 'id'>>) => void
  deleteTank: (tankId: string) => void
  reorderTanks: (orderedIds: string[]) => void

  // Fuel grades
  addFuelGrade: (grade: Omit<FuelGrade, 'id' | 'builtIn'>) => string
  updateFuelGrade: (id: string, updates: Partial<Omit<FuelGrade, 'id' | 'builtIn'>>) => void
  deleteFuelGrade: (id: string) => void

  // Persistence helpers
  exportData: () => string
  importData: (json: string) => void
}

export const useVesselStore = create<VesselState>()(
  persist(
    (set, get) => ({
      vessels: [],
      activeVesselId: null,
      fuelGrades: DEFAULT_FUEL_GRADES,

      addVessel: (name, imoNumber) => {
        const id = uuidv4()
        set(s => ({
          vessels: [...s.vessels, { id, name, imoNumber, tanks: [] }],
          activeVesselId: s.activeVesselId ?? id,
        }))
        return id
      },

      updateVessel: (id, updates) =>
        set(s => ({
          vessels: s.vessels.map(v => (v.id === id ? { ...v, ...updates } : v)),
        })),

      deleteVessel: (id) =>
        set(s => {
          const remaining = s.vessels.filter(v => v.id !== id)
          return {
            vessels: remaining,
            activeVesselId:
              s.activeVesselId === id ? (remaining[0]?.id ?? null) : s.activeVesselId,
          }
        }),

      setActiveVessel: (id) => set({ activeVesselId: id }),

      getActiveVessel: () => {
        const { vessels, activeVesselId } = get()
        return vessels.find(v => v.id === activeVesselId) ?? null
      },

      addTank: (tank) => {
        const { vessels, activeVesselId } = get()
        if (!activeVesselId) return
        const vessel = vessels.find(v => v.id === activeVesselId)
        if (!vessel) return
        const maxOrder = vessel.tanks.reduce((m, t) => Math.max(m, t.consumptionOrder), 0)
        const newTank: Tank = { ...tank, id: uuidv4(), consumptionOrder: maxOrder + 1 }
        set(s => ({
          vessels: s.vessels.map(v =>
            v.id === activeVesselId ? { ...v, tanks: [...v.tanks, newTank] } : v
          ),
        }))
      },

      updateTank: (tankId, updates) => {
        const { activeVesselId } = get()
        if (!activeVesselId) return
        set(s => ({
          vessels: s.vessels.map(v =>
            v.id === activeVesselId
              ? { ...v, tanks: v.tanks.map(t => (t.id === tankId ? { ...t, ...updates } : t)) }
              : v
          ),
        }))
      },

      deleteTank: (tankId) => {
        const { activeVesselId } = get()
        if (!activeVesselId) return
        set(s => ({
          vessels: s.vessels.map(v =>
            v.id === activeVesselId
              ? { ...v, tanks: v.tanks.filter(t => t.id !== tankId) }
              : v
          ),
        }))
      },

      reorderTanks: (orderedIds) => {
        const { activeVesselId } = get()
        if (!activeVesselId) return
        set(s => ({
          vessels: s.vessels.map(v => {
            if (v.id !== activeVesselId) return v
            const reordered = orderedIds
              .map((id, idx) => {
                const tank = v.tanks.find(t => t.id === id)
                return tank ? { ...tank, consumptionOrder: idx + 1 } : null
              })
              .filter(Boolean) as Tank[]
            return { ...v, tanks: reordered }
          }),
        }))
      },

      addFuelGrade: (grade) => {
        const id = uuidv4()
        set(s => ({
          fuelGrades: [...s.fuelGrades, { ...grade, id, builtIn: false }],
        }))
        return id
      },

      updateFuelGrade: (id, updates) =>
        set(s => ({
          fuelGrades: s.fuelGrades.map(g => (g.id === id ? { ...g, ...updates } : g)),
        })),

      deleteFuelGrade: (id) =>
        set(s => ({
          fuelGrades: s.fuelGrades.filter(g => g.id !== id || g.builtIn),
        })),

      exportData: () => {
        const { vessels, activeVesselId, fuelGrades } = get()
        return JSON.stringify({ vessels, activeVesselId, fuelGrades }, null, 2)
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            vessels: data.vessels ?? [],
            activeVesselId: data.activeVesselId ?? null,
            fuelGrades: data.fuelGrades ?? DEFAULT_FUEL_GRADES,
          })
        } catch {
          throw new Error('Invalid vessel data file')
        }
      },
    }),
    {
      name: `${STORAGE_KEY_VESSELS}_v1`,
      partialize: (s) => ({
        vessels: s.vessels,
        activeVesselId: s.activeVesselId,
        fuelGrades: s.fuelGrades,
      }),
    }
  )
)
