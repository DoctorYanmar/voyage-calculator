export interface Tank {
  id: string
  name: string            // "HFO P", "Settling SB", "MGO Day Tank"
  fuelGradeId: string
  capacityMT: number
  robMT: number           // initial ROB at start of voyage
  consumptionOrder: number // 1 = drawn first within its grade group
  notes?: string
}

export interface Vessel {
  id: string
  name: string
  imoNumber?: string
  tanks: Tank[]
}
