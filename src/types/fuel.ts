export interface FuelGrade {
  id: string
  label: string          // "VLSFO 0.5%", "HFO 3.5%", "MGO 0.1%"
  sulfurPct: number
  isEcaCompliant: boolean
  color: string          // tailwind color name for badges: 'blue', 'amber', 'green', etc.
  density: number        // MT/m³ default
  builtIn: boolean       // true = cannot be deleted, false = user-defined
}
