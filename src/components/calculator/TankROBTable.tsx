import { useVesselStore } from '../../store/vesselStore'
import { FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { formatMT } from '../../lib/calculations'
import type { VoyageCalculation, Vessel } from '../../types'

export function TankROBTable({ calc, vessel }: { calc: VoyageCalculation; vessel: Vessel }) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)

  const tanks = [...vessel.tanks].sort((a, b) => a.consumptionOrder - b.consumptionOrder)

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Tank ROB Summary</h2>
      <div className="rounded-xl border border-slate-700/60 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tank</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Start</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Final</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map(tank => {
              const grade = fuelGrades.find(g => g.id === tank.fuelGradeId)
              const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
              const initialRob = calc.initialTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
              const finalRob = calc.finalTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
              const used = initialRob - finalRob
              const pct = tank.capacityMT > 0 ? (finalRob / tank.capacityMT) * 100 : 0
              const isEmpty = finalRob < 0.1

              return (
                <tr key={tank.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.bg} border ${colors.border} shrink-0`} />
                      <div>
                        <p className="text-xs font-medium text-slate-200">{tank.name}</p>
                        <p className={`text-xs ${colors.text}`}>{grade?.label ?? tank.fuelGradeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-mono text-slate-400">{formatMT(initialRob)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-mono font-semibold ${isEmpty ? 'text-slate-600' : 'text-slate-200'}`}>
                        {isEmpty ? '—' : formatMT(finalRob)}
                      </span>
                      {!isEmpty && (
                        <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 40 ? 'bg-green-500' : pct > 15 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-600 text-center">
        Order = global consumption priority
      </div>
    </div>
  )
}
