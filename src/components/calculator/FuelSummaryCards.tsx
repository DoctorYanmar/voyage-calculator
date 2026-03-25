import { useVesselStore } from '../../store/vesselStore'
import { FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { formatMT } from '../../lib/calculations'
import type { VoyageCalculation } from '../../types'

export function FuelSummaryCards({ calc }: { calc: VoyageCalculation }) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)

  // Only show grades that appear in the calculation
  const activeGrades = fuelGrades.filter(g =>
    (calc.initialRobByGrade[g.id] ?? 0) > 0 ||
    (calc.totalConsumptionByGrade[g.id] ?? 0) > 0
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {activeGrades.map(grade => {
        const initial = calc.initialRobByGrade[grade.id] ?? 0
        const consumed = calc.totalConsumptionByGrade[grade.id] ?? 0
        const remaining = calc.finalRobByGrade[grade.id] ?? 0
        const pct = initial > 0 ? Math.round((remaining / initial) * 100) : 0
        const colors = FUEL_COLOR_MAP[grade.color] ?? FUEL_COLOR_MAP['slate']

        return (
          <div
            key={grade.id}
            className={`rounded-xl border p-3 flex flex-col gap-2 ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{grade.label}</span>
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Start</span>
                <span className="text-slate-300 font-mono">{formatMT(initial)} MT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Used</span>
                <span className={`font-mono ${consumed > 0 ? colors.text : 'text-slate-500'}`}>−{formatMT(consumed)} MT</span>
              </div>
              <div className="flex justify-between text-xs border-t border-slate-700/40 pt-1 mt-0.5">
                <span className="text-slate-400 font-medium">Final ROB</span>
                <span className={`font-mono font-semibold ${remaining < initial * 0.1 ? 'text-red-400' : 'text-slate-200'}`}>
                  {formatMT(remaining)} MT
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
