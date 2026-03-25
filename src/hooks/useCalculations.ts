import { useMemo } from 'react'
import { useVesselStore } from '../store/vesselStore'
import { useVoyageStore } from '../store/voyageStore'
import { calculateVoyage } from '../lib/calculations'
import type { VoyageCalculation } from '../types'

export function useCalculations(): VoyageCalculation | null {
  const voyage = useVoyageStore(s => s.voyage)
  const vessels = useVesselStore(s => s.vessels)
  const activeVesselId = useVesselStore(s => s.activeVesselId)

  return useMemo(() => {
    if (!voyage || !activeVesselId) return null
    const vessel = vessels.find(v => v.id === activeVesselId)
    if (!vessel) return null
    return calculateVoyage(voyage, vessel)
  }, [voyage, vessels, activeVesselId])
}
