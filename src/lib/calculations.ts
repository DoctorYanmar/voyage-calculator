import type {
  Vessel,
  Tank,
  VoyageLeg,
  Voyage,
  LegResult,
  VoyageCalculation,
  TankSnapshot,
  LegConsumptionDetail,
  FuelBlend,
} from '../types'

// ─── Utility helpers ──────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function addToMap(map: Record<string, number>, key: string, value: number) {
  map[key] = round2((map[key] ?? 0) + value)
}

/** Returns current ROB for each tank from the snapshot array */
function snapshotToMap(snapshots: TankSnapshot[]): Map<string, number> {
  const m = new Map<string, number>()
  snapshots.forEach(s => m.set(s.tankId, s.robMT))
  return m
}

/** Convert snapshot map back to array */
function mapToSnapshots(m: Map<string, number>): TankSnapshot[] {
  return Array.from(m.entries()).map(([tankId, robMT]) => ({ tankId, robMT: round2(robMT) }))
}

/**
 * Draw `required` MT from a prioritized list of tanks.
 * Returns how much was actually drawn (may be less if insufficient ROB),
 * mutates `robMap`, and appends any warnings.
 */
function drawFromTanks(
  required: number,
  orderedTankIds: string[],
  robMap: Map<string, number>,
  warnings: string[],
  labelForWarning: string
): number {
  let remaining = required
  for (const tid of orderedTankIds) {
    if (remaining <= 0.001) break
    const available = robMap.get(tid) ?? 0
    const draw = Math.min(available, remaining)
    robMap.set(tid, round2(available - draw))
    remaining = round2(remaining - draw)
  }
  if (remaining > 0.001) {
    warnings.push(
      `⚠ Insufficient fuel on ${labelForWarning}: short by ${round2(remaining)} MT`
    )
  }
  return round2(required - remaining)
}

// ─── Leg duration helpers ─────────────────────────────────────────────────────

function legSeaHours(leg: VoyageLeg): number {
  if (leg.type !== 'sea' && leg.type !== 'canal' && leg.type !== 'drifting') return 0
  if (leg.durationHours != null && leg.durationHours > 0) return leg.durationHours
  if (leg.distanceNm && leg.speedKnots && leg.speedKnots > 0) {
    return leg.distanceNm / leg.speedKnots
  }
  return 0
}

function legPortHours(leg: VoyageLeg): number {
  if (leg.type !== 'port' && leg.type !== 'anchorage') return 0
  return leg.durationHours ?? 0
}

// ─── ECA hours split ──────────────────────────────────────────────────────────

function ecaSplit(leg: VoyageLeg, totalSeaHours: number): { ecaHours: number; nonEcaHours: number } {
  const eca = leg.ecaZone
  if (!eca?.enabled || !eca.ecaDistanceNm || !leg.distanceNm || leg.distanceNm <= 0) {
    return { ecaHours: 0, nonEcaHours: totalSeaHours }
  }
  const frac = Math.min(eca.ecaDistanceNm / leg.distanceNm, 1)
  const ecaHours = round2(totalSeaHours * frac)
  return { ecaHours, nonEcaHours: round2(totalSeaHours - ecaHours) }
}

// ─── Build ordered tank draw list ────────────────────────────────────────────

/**
 * Returns ordered tank IDs for a given fuel grade.
 * Preference: per-leg override list → global consumption order on vessel.
 */
function resolveTankOrder(
  fuelGradeId: string,
  perLegOverride: string[],
  allTanks: Tank[]
): string[] {
  if (perLegOverride.length > 0) return perLegOverride
  return allTanks
    .filter(t => t.fuelGradeId === fuelGradeId)
    .sort((a, b) => a.consumptionOrder - b.consumptionOrder)
    .map(t => t.id)
}

// ─── Compute one leg's consumption ───────────────────────────────────────────

function computeLegConsumption(
  leg: VoyageLeg,
  vessel: Vessel,
  blendLibrary: FuelBlend[]
): { detail: LegConsumptionDetail; demands: Record<string, { qty: number; tankIds: string[] }> } {
  const seaHoursTotal = legSeaHours(leg)
  const portHours = legPortHours(leg)
  const { ecaHours, nonEcaHours } = ecaSplit(leg, seaHoursTotal)

  const mainConsumption: Record<string, number> = {}
  const ecaConsumption: Record<string, number> = {}
  const blendConsumption: Record<string, number> = {}

  // demands maps fuelGradeId → { total MT needed, which tanks to use }
  const demands: Record<string, { qty: number; tankIds: string[] }> = {}

  const addDemand = (gradeId: string, qty: number, tankIds: string[]) => {
    if (qty <= 0) return
    if (!demands[gradeId]) {
      demands[gradeId] = {
        qty: 0,
        tankIds: resolveTankOrder(gradeId, tankIds, vessel.tanks),
      }
    }
    demands[gradeId].qty = round2(demands[gradeId].qty + qty)
  }

  const blendMode = leg.blendMode
  const ecaZone = leg.ecaZone

  if (blendMode?.enabled) {
    // ── Blend mode: simultaneous multi-grade consumption ──────────────────────
    const blend = blendLibrary.find(b => b.id === blendMode.blendId)
    if (blend) {
      const totalHours = seaHoursTotal + portHours
      const portRate = blendMode.portTotalRatePerDay ?? blendMode.totalRatePerDay
      const seaQtyTotal = round2(blendMode.totalRatePerDay * (nonEcaHours / 24))
      const portQtyTotal = round2(portRate * (portHours / 24))
      const grandTotal = round2(seaQtyTotal + portQtyTotal)

      for (const stream of blend.streams) {
        const qty = round2(grandTotal * stream.ratio)
        if (qty > 0) {
          blendConsumption[stream.fuelGradeId] = (blendConsumption[stream.fuelGradeId] ?? 0) + qty
          addDemand(stream.fuelGradeId, qty, stream.tankIds)
        }
      }

      // ECA on top of blend (same pattern — ECA fuel is separate)
      if (ecaZone?.enabled && ecaHours > 0) {
        const ecaQty = round2(ecaZone.ecaRatePerDay * (ecaHours / 24))
        ecaConsumption[ecaZone.ecaFuelGradeId] =
          (ecaConsumption[ecaZone.ecaFuelGradeId] ?? 0) + ecaQty
        addDemand(ecaZone.ecaFuelGradeId, ecaQty, ecaZone.ecaTankIds)
      }
    }
  } else if (ecaZone?.enabled && ecaHours > 0) {
    // ── ECA split mode ────────────────────────────────────────────────────────
    // Non-ECA portion uses main fuelStreams (or override)
    for (const stream of leg.fuelStreams) {
      const nonEcaRate = stream.ratePerDay
      const portRate = stream.portRatePerDay ?? stream.ratePerDay
      const nonEcaQty = round2(nonEcaRate * (nonEcaHours / 24))
      const portQty = round2(portRate * (portHours / 24))
      const total = round2(nonEcaQty + portQty)
      if (total > 0) {
        mainConsumption[stream.fuelGradeId] = (mainConsumption[stream.fuelGradeId] ?? 0) + total
        addDemand(stream.fuelGradeId, total, stream.tankIds)
      }
    }

    // Non-ECA override
    if (ecaZone.nonEcaOverride) {
      const ov = ecaZone.nonEcaOverride
      const qty = round2(ov.ratePerDay * (nonEcaHours / 24))
      if (qty > 0) {
        mainConsumption[ov.fuelGradeId] = (mainConsumption[ov.fuelGradeId] ?? 0) + qty
        addDemand(ov.fuelGradeId, qty, ov.tankIds)
      }
    }

    // ECA portion
    const ecaQty = round2(ecaZone.ecaRatePerDay * (ecaHours / 24))
    if (ecaQty > 0) {
      ecaConsumption[ecaZone.ecaFuelGradeId] =
        (ecaConsumption[ecaZone.ecaFuelGradeId] ?? 0) + ecaQty
      addDemand(ecaZone.ecaFuelGradeId, ecaQty, ecaZone.ecaTankIds)
    }
  } else {
    // ── Standard mode ─────────────────────────────────────────────────────────
    for (const stream of leg.fuelStreams) {
      const seaRate = stream.ratePerDay
      const portRate = stream.portRatePerDay ?? stream.ratePerDay
      const seaQty = round2(seaRate * (seaHoursTotal / 24))
      const portQty = round2(portRate * (portHours / 24))
      const total = round2(seaQty + portQty)
      if (total > 0) {
        mainConsumption[stream.fuelGradeId] = (mainConsumption[stream.fuelGradeId] ?? 0) + total
        addDemand(stream.fuelGradeId, total, stream.tankIds)
      }
    }
  }

  // Build combined total
  const total: Record<string, number> = {}
  for (const [g, v] of Object.entries(mainConsumption)) addToMap(total, g, v)
  for (const [g, v] of Object.entries(ecaConsumption)) addToMap(total, g, v)
  for (const [g, v] of Object.entries(blendConsumption)) addToMap(total, g, v)

  return {
    detail: {
      main: mainConsumption,
      eca: ecaConsumption,
      blend: blendConsumption,
      total,
      seaHoursTotal,
      ecaHours,
      nonEcaHours,
      portHours,
    },
    demands,
  }
}

// ─── Main calculation entry point ─────────────────────────────────────────────

export function calculateVoyage(voyage: Voyage, vessel: Vessel): VoyageCalculation {
  const sortedLegs = [...voyage.legs].sort((a, b) => a.order - b.order)
  const blendLibrary = voyage.blendLibrary

  // Initialize ROB from vessel tank setup
  const robMap = new Map<string, number>()
  vessel.tanks.forEach(t => robMap.set(t.id, t.robMT))

  // Snapshot for initial state
  const initialTankSnapshots = mapToSnapshots(robMap)

  // Compute initial ROB by grade
  const initialRobByGrade: Record<string, number> = {}
  vessel.tanks.forEach(t => addToMap(initialRobByGrade, t.fuelGradeId, t.robMT))

  const totalConsumptionByGrade: Record<string, number> = {}
  const legResults: LegResult[] = []
  const allWarnings: string[] = []

  for (const leg of sortedLegs) {
    const warnings: string[] = []

    // 1. Compute consumption for this leg
    const { detail, demands } = computeLegConsumption(leg, vessel, blendLibrary)

    // 2. Deduct from tanks
    for (const [gradeId, { qty, tankIds }] of Object.entries(demands)) {
      drawFromTanks(qty, tankIds, robMap, warnings, leg.name)
      addToMap(totalConsumptionByGrade, gradeId, qty)
    }

    // 3. Apply bunker events after this leg
    const bunkerReceived: Record<string, number> = {}
    const bunkers = voyage.bunkerEvents.filter(b => b.afterLegId === leg.id)
    for (const bunker of bunkers) {
      for (const [gradeId, qty] of Object.entries(bunker.quantities)) {
        if (qty > 0) {
          // Find first tank of that grade that isn't full, or just add to the first one
          const gradeTanks = vessel.tanks
            .filter(t => t.fuelGradeId === gradeId)
            .sort((a, b) => a.consumptionOrder - b.consumptionOrder)

          let remaining = qty
          for (const tank of gradeTanks) {
            if (remaining <= 0) break
            const currentRob = robMap.get(tank.id) ?? 0
            const space = Math.max(0, tank.capacityMT - currentRob)
            const add = Math.min(space, remaining)
            robMap.set(tank.id, round2(currentRob + add))
            remaining = round2(remaining - add)
          }
          // If there's remaining that didn't fit (overfill scenario), add to first tank
          if (remaining > 0.001) {
            const firstTank = gradeTanks[0]
            if (firstTank) {
              robMap.set(firstTank.id, round2((robMap.get(firstTank.id) ?? 0) + remaining))
              warnings.push(
                `ℹ Bunker overfill for ${gradeId} on leg "${leg.name}": ${round2(remaining)} MT exceeds capacity`
              )
            }
          }
          addToMap(bunkerReceived, gradeId, qty)
        }
      }
    }

    // 4. Build grade ROB snapshot
    const robByGradeAtEnd: Record<string, number> = {}
    vessel.tanks.forEach(t => {
      const rob = robMap.get(t.id) ?? 0
      addToMap(robByGradeAtEnd, t.fuelGradeId, rob)
    })

    const tankSnapshotAtEnd = mapToSnapshots(robMap)

    if (warnings.length) allWarnings.push(...warnings)

    legResults.push({
      legId: leg.id,
      consumption: detail,
      tankSnapshotAtEnd,
      robByGradeAtEnd,
      bunkerReceived,
      warnings,
    })
  }

  const finalTankSnapshots = legResults.length
    ? legResults[legResults.length - 1].tankSnapshotAtEnd
    : initialTankSnapshots

  const finalRobByGrade: Record<string, number> = {}
  vessel.tanks.forEach(t => {
    const rob = finalTankSnapshots.find(s => s.tankId === t.id)?.robMT ?? 0
    addToMap(finalRobByGrade, t.fuelGradeId, rob)
  })

  return {
    legResults,
    initialRobByGrade,
    initialTankSnapshots,
    totalConsumptionByGrade,
    finalRobByGrade,
    finalTankSnapshots,
    allWarnings,
  }
}

// ─── Helper used by components ────────────────────────────────────────────────

/** Get tank snapshots before a given leg (i.e., end of previous leg, or initial state) */
export function getRobBeforeLeg(
  legIndex: number,
  calc: VoyageCalculation
): TankSnapshot[] {
  if (legIndex === 0) return calc.initialTankSnapshots
  return calc.legResults[legIndex - 1].tankSnapshotAtEnd
}

/** Sum all values in a Record<string,number> */
export function sumRecord(r: Record<string, number>): number {
  return round2(Object.values(r).reduce((a, b) => a + b, 0))
}

/** Format MT value with up to 2 decimals, no trailing zeros */
export function formatMT(n: number): string {
  if (n === 0) return '0'
  const s = n.toFixed(2)
  return s.replace(/\.?0+$/, '')
}

/** Format hours as "Xd Yh" */
export function formatHours(h: number): string {
  if (h <= 0) return '—'
  const days = Math.floor(h / 24)
  const hrs = Math.round(h % 24)
  if (days === 0) return `${hrs}h`
  if (hrs === 0) return `${days}d`
  return `${days}d ${hrs}h`
}
