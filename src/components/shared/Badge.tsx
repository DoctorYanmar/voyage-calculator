import { FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { useVesselStore } from '../../store/vesselStore'

interface FuelBadgeProps {
  fuelGradeId: string
  size?: 'sm' | 'md'
  suffix?: string
}

export function FuelBadge({ fuelGradeId, size = 'sm', suffix }: FuelBadgeProps) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const grade = fuelGrades.find(g => g.id === fuelGradeId)
  if (!grade) return <span className="text-slate-500 text-xs">{fuelGradeId}</span>

  const colors = FUEL_COLOR_MAP[grade.color] ?? FUEL_COLOR_MAP['slate']
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium border ${sizeClass} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {grade.label}
      {suffix && <span className="opacity-70">{suffix}</span>}
    </span>
  )
}

interface ColorDotProps {
  color: string
  size?: number
}

export function ColorDot({ color, size = 8 }: ColorDotProps) {
  const colors = FUEL_COLOR_MAP[color] ?? FUEL_COLOR_MAP['slate']
  return (
    <span
      className={`inline-block rounded-full ${colors.bg} border ${colors.border}`}
      style={{ width: size, height: size }}
    />
  )
}
