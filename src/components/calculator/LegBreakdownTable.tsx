import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Fuel } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { formatMT, formatHours, getRobBeforeLeg } from '../../lib/calculations'
import type { VoyageCalculation, Voyage, Vessel } from '../../types'
import { LEG_TYPE_LABELS } from '../../constants/defaults'

function LegModeTag({ result, voyage }: { result: any; voyage: Voyage }) {
  const legData = voyage.legs.find(l => l.id === result.legId)
  if (!legData) return null
  if (legData.blendMode?.enabled) {
    const blend = voyage.blendLibrary.find(b => b.id === legData.blendMode!.blendId)
    return <span className="text-xs bg-violet-900/40 border border-violet-700/40 text-violet-300 px-1.5 py-0.5 rounded">{blend?.label ?? 'Blend'}</span>
  }
  if (legData.ecaZone?.enabled) {
    return <span className="text-xs bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 px-1.5 py-0.5 rounded">ECA</span>
  }
  return null
}

export function LegBreakdownTable({
  calc,
  voyage,
  vessel,
}: {
  calc: VoyageCalculation
  voyage: Voyage
  vessel: Vessel
}) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const [expandedLeg, setExpandedLeg] = useState<string | null>(null)

  // Determine which fuel grades appear in any leg
  const activeGradeIds = Array.from(
    new Set(
      calc.legResults.flatMap(r => Object.keys(r.consumption.total))
    )
  ).filter(id => fuelGrades.find(g => g.id === id))

  const legs = voyage.legs.slice().sort((a, b) => a.order - b.order)

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Leg-by-Leg Breakdown</h2>
      <div className="rounded-xl border border-slate-700/60 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              <th className="px-3 py-2.5 w-8" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Leg</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
              {activeGradeIds.map(id => {
                const grade = fuelGrades.find(g => g.id === id)
                const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                return (
                  <th key={id} className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                    {grade?.label ?? id}
                  </th>
                )
              })}
              {activeGradeIds.map(id => {
                const grade = fuelGrades.find(g => g.id === id)
                const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                return (
                  <th key={`rob-${id}`} className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${colors.text} opacity-60`}>
                    ROB {grade?.label ?? id}
                  </th>
                )
              })}
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, i) => {
              const result = calc.legResults.find(r => r.legId === leg.id)
              if (!result) return null
              const expanded = expandedLeg === leg.id
              const hasEca = Object.keys(result.consumption.eca).length > 0
              const hasBlend = Object.keys(result.consumption.blend).length > 0
              const hasWarnings = result.warnings.length > 0
              const bunkerTotal = Object.values(result.bunkerReceived).reduce((s, v) => s + v, 0)

              const totalHours = result.consumption.seaHoursTotal + result.consumption.portHours

              return (
                <>
                  {/* Main row */}
                  <tr
                    key={leg.id}
                    className={`border-b border-slate-700/30 cursor-pointer hover:bg-slate-800/40 transition-colors ${
                      expanded ? 'bg-slate-800/30' : ''
                    }`}
                    onClick={() => setExpandedLeg(expanded ? null : leg.id)}
                  >
                    <td className="px-2 py-3 text-slate-500">
                      {expanded
                        ? <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm text-slate-200 font-medium">{leg.name}</p>
                          <p className="text-xs text-slate-500">{LEG_TYPE_LABELS[leg.type]}</p>
                        </div>
                        <LegModeTag result={result} voyage={voyage} />
                        {hasWarnings && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs font-mono text-slate-400">{formatHours(totalHours)}</span>
                    </td>
                    {activeGradeIds.map(gradeId => {
                      const qty = result.consumption.total[gradeId] ?? 0
                      const grade = fuelGrades.find(g => g.id === gradeId)
                      const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                      return (
                        <td key={gradeId} className="px-3 py-3 text-right">
                          {qty > 0
                            ? <span className={`text-sm font-mono font-medium ${colors.text}`}>{formatMT(qty)}</span>
                            : <span className="text-slate-600 text-sm">—</span>
                          }
                        </td>
                      )
                    })}
                    {activeGradeIds.map(gradeId => {
                      const rob = result.robByGradeAtEnd[gradeId] ?? 0
                      const isLow = rob < 100 && rob > 0
                      return (
                        <td key={`rob-${gradeId}`} className="px-3 py-3 text-right">
                          <span className={`text-sm font-mono ${isLow ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
                            {formatMT(rob)}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3" />
                  </tr>

                  {/* Expanded detail */}
                  {expanded && (
                    <tr key={`${leg.id}-detail`} className="border-b border-slate-700/30 bg-slate-900/40">
                      <td />
                      <td colSpan={99} className="px-4 py-3">
                        <div className="flex flex-wrap gap-4 text-xs">
                          {/* Time breakdown */}
                          <div className="min-w-[140px]">
                            <p className="text-slate-500 uppercase tracking-wide font-semibold mb-1">Time</p>
                            {result.consumption.seaHoursTotal > 0 && (
                              <p className="text-slate-400">Sea: <span className="text-slate-200">{formatHours(result.consumption.seaHoursTotal)}</span></p>
                            )}
                            {result.consumption.ecaHours > 0 && (
                              <p className="text-emerald-400">ECA: {formatHours(result.consumption.ecaHours)}</p>
                            )}
                            {result.consumption.nonEcaHours > 0 && result.consumption.ecaHours > 0 && (
                              <p className="text-slate-400">Non-ECA: {formatHours(result.consumption.nonEcaHours)}</p>
                            )}
                            {result.consumption.portHours > 0 && (
                              <p className="text-slate-400">Port: <span className="text-slate-200">{formatHours(result.consumption.portHours)}</span></p>
                            )}
                          </div>

                          {/* Consumption breakdown */}
                          <div className="min-w-[200px]">
                            <p className="text-slate-500 uppercase tracking-wide font-semibold mb-1">Consumption</p>
                            {Object.entries(result.consumption.main).filter(([,v]) => v > 0).map(([g, v]) => {
                              const gr = fuelGrades.find(f => f.id === g)
                              return <p key={g} className="text-slate-300">{gr?.label ?? g}: <strong>{formatMT(v)} MT</strong> <span className="text-slate-500">(main)</span></p>
                            })}
                            {Object.entries(result.consumption.eca).filter(([,v]) => v > 0).map(([g, v]) => {
                              const gr = fuelGrades.find(f => f.id === g)
                              return <p key={g} className="text-emerald-300">{gr?.label ?? g}: <strong>{formatMT(v)} MT</strong> <span className="text-emerald-600">(ECA)</span></p>
                            })}
                            {Object.entries(result.consumption.blend).filter(([,v]) => v > 0).map(([g, v]) => {
                              const gr = fuelGrades.find(f => f.id === g)
                              return <p key={g} className="text-violet-300">{gr?.label ?? g}: <strong>{formatMT(v)} MT</strong> <span className="text-violet-600">(blend)</span></p>
                            })}
                          </div>

                          {/* Bunker received */}
                          {bunkerTotal > 0 && (
                            <div className="min-w-[160px]">
                              <p className="text-slate-500 uppercase tracking-wide font-semibold mb-1">Bunker Received</p>
                              {Object.entries(result.bunkerReceived).filter(([,v]) => v > 0).map(([g, v]) => {
                                const gr = fuelGrades.find(f => f.id === g)
                                return <p key={g} className="text-blue-300">+{formatMT(v)} MT {gr?.label ?? g}</p>
                              })}
                            </div>
                          )}

                          {/* Warnings */}
                          {result.warnings.length > 0 && (
                            <div className="min-w-[200px]">
                              <p className="text-amber-500 uppercase tracking-wide font-semibold mb-1">Warnings</p>
                              {result.warnings.map((w, wi) => (
                                <p key={wi} className="text-amber-300">{w}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}

            {/* Totals row */}
            <tr className="bg-slate-800/60 border-t border-slate-600/50">
              <td className="px-2 py-3" />
              <td className="px-3 py-3">
                <span className="text-sm font-semibold text-slate-200">TOTAL</span>
              </td>
              <td className="px-3 py-3" />
              {activeGradeIds.map(gradeId => {
                const total = calc.totalConsumptionByGrade[gradeId] ?? 0
                const grade = fuelGrades.find(g => g.id === gradeId)
                const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                return (
                  <td key={gradeId} className="px-3 py-3 text-right">
                    <span className={`text-sm font-mono font-bold ${colors.text}`}>{formatMT(total)}</span>
                    <span className="text-xs text-slate-500 ml-1">MT</span>
                  </td>
                )
              })}
              {activeGradeIds.map(gradeId => {
                const finalRob = calc.finalRobByGrade[gradeId] ?? 0
                const isLow = finalRob < 100 && finalRob > 0
                return (
                  <td key={`rob-${gradeId}`} className="px-3 py-3 text-right">
                    <span className={`text-sm font-mono font-bold ${isLow ? 'text-amber-400' : 'text-slate-200'}`}>{formatMT(finalRob)}</span>
                    <span className="text-xs text-slate-500 ml-1">MT</span>
                  </td>
                )
              })}
              <td className="px-3 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 mt-2">Click any row to expand consumption details · Bunker events shown in expanded view</p>
    </div>
  )
}
