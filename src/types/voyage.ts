// A single fuel stream on a leg: one grade, one rate, ordered tank draw list
export interface FuelStream {
  fuelGradeId: string
  ratePerDay: number      // MT/day at sea or in port
  portRatePerDay?: number // optional separate port rate; falls back to ratePerDay
  tankIds: string[]       // ordered tanks to draw from (empty = use global order)
}

// Reusable simultaneous blend definition stored at voyage level
export interface FuelBlend {
  id: string
  label: string           // "VLSFO/HFO 90:10"
  streams: Array<{
    fuelGradeId: string
    ratio: number         // 0.0–1.0, all streams must sum to 1.0
    tankIds: string[]     // ordered tanks for this grade within the blend
  }>
}

export type LegType = 'sea' | 'port' | 'anchorage' | 'canal' | 'drifting'

export interface VoyageLeg {
  id: string
  name: string            // "Singapore → Rotterdam"
  type: LegType
  order: number           // display/calculation sequence

  // Sea leg geometry
  distanceNm?: number
  speedKnots?: number

  // Port/anchorage/canal duration (hours) — overrides distance/speed calculation
  durationHours?: number

  // --- Standard fuel streams (used when ecaZone and blendMode are inactive) ---
  fuelStreams: FuelStream[]

  // --- ECA zone (sea legs only) ---
  ecaZone?: {
    enabled: boolean
    ecaDistanceNm: number           // nm inside ECA
    ecaFuelGradeId: string          // ECA-compliant fuel
    ecaRatePerDay: number           // MT/day in ECA
    ecaTankIds: string[]            // tanks to draw for ECA fuel
    // Non-ECA override (if different from main fuelStreams)
    nonEcaOverride?: {
      fuelGradeId: string
      ratePerDay: number
      tankIds: string[]
    }
  }

  // --- Simultaneous blend mode ---
  blendMode?: {
    enabled: boolean
    blendId: string         // references voyage-level FuelBlend
    totalRatePerDay: number // combined MT/day; ratios applied to this total
    portTotalRatePerDay?: number // optional separate port rate for blend
  }
}

export interface BunkerEvent {
  id: string
  afterLegId: string      // bunker received immediately after this leg
  port: string
  quantities: Record<string, number>   // { fuelGradeId: MT }
  notes?: string
}

export interface Voyage {
  id: string
  name: string
  vesselId: string
  legs: VoyageLeg[]
  bunkerEvents: BunkerEvent[]
  blendLibrary: FuelBlend[]
  notes?: string
}

// ─── Derived calculation output (never stored) ───────────────────────────────

export interface TankSnapshot {
  tankId: string
  robMT: number
}

export interface LegConsumptionDetail {
  // Main (non-ECA) consumption per grade
  main: Record<string, number>
  // ECA portion consumption per grade
  eca: Record<string, number>
  // Blend mode per-grade consumption
  blend: Record<string, number>
  // Sum of all three for each grade
  total: Record<string, number>
  // Duration details
  seaHoursTotal: number
  ecaHours: number
  nonEcaHours: number
  portHours: number
}

export interface LegResult {
  legId: string
  consumption: LegConsumptionDetail
  tankSnapshotAtEnd: TankSnapshot[]         // ROB per tank after this leg + bunker
  robByGradeAtEnd: Record<string, number>   // total ROB per grade
  bunkerReceived: Record<string, number>    // bunker added after this leg
  warnings: string[]
}

export interface VoyageCalculation {
  legResults: LegResult[]
  initialRobByGrade: Record<string, number>
  initialTankSnapshots: TankSnapshot[]
  totalConsumptionByGrade: Record<string, number>
  finalRobByGrade: Record<string, number>
  finalTankSnapshots: TankSnapshot[]
  allWarnings: string[]
}
