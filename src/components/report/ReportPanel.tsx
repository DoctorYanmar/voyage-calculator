import { useState, useRef } from 'react'
import { FileText, Download, Printer, AlertCircle } from 'lucide-react'
import { useCalculations } from '../../hooks/useCalculations'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { useUiStore } from '../../store/uiStore'
import { exportToPDF, buildReportHTML } from '../../lib/reportUtils'
import { formatMT, formatHours } from '../../lib/calculations'
import { FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { EmptyState } from '../shared/EmptyState'
import toast from 'react-hot-toast'

export function ReportPanel() {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const voyage = useVoyageStore(s => s.voyage)
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const calc = useCalculations()
  const setTab = useUiStore(s => s.setActiveTab)

  const [exporting, setExporting] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  if (!vessel || !voyage || !calc || voyage.legs.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="No calculations available"
          description="Complete the Vessel Setup and Voyage Plan before generating a report."
          action={
            <button onClick={() => setTab('calculator')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              View Calculations
            </button>
          }
        />
      </div>
    )
  }

  const activeGradeIds = Array.from(
    new Set(calc.legResults.flatMap(r => Object.keys(r.consumption.total)))
  ).filter(id => fuelGrades.find(g => g.id === id))

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportToPDF(calc, voyage, vessel, fuelGrades)
      toast.success('PDF exported')
    } catch {
      toast.error('PDF export failed. Try the Print option.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    const html = buildReportHTML(calc, voyage, vessel, fuelGrades)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      setTimeout(() => w.print(), 300)
    }
  }

  const legs = voyage.legs.slice().sort((a, b) => a.order - b.order)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Voyage Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">{vessel.name} · {voyage.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Warnings */}
      {calc.allWarnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Warnings included in report</p>
          </div>
          <ul className="flex flex-col gap-0.5">
            {calc.allWarnings.map((w, i) => <li key={i} className="text-sm text-amber-300">{w}</li>)}
          </ul>
        </div>
      )}

      {/* Fuel summary */}
      <div className="mb-5 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Fuel Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeGradeIds.map(id => {
            const grade = fuelGrades.find(g => g.id === id)
            const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
            const initial = calc.initialRobByGrade[id] ?? 0
            const consumed = calc.totalConsumptionByGrade[id] ?? 0
            const final = calc.finalRobByGrade[id] ?? 0
            return (
              <div key={id} className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors.text}`}>{grade?.label ?? id}</p>
                <div className="flex flex-col gap-0.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Initial ROB</span><span className="text-slate-300 font-mono">{formatMT(initial)} MT</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Consumed</span><span className={`font-mono ${colors.text}`}>{formatMT(consumed)} MT</span></div>
                  <div className="flex justify-between border-t border-slate-700/40 pt-1 mt-0.5"><span className="text-slate-300 font-medium">Final ROB</span><span className="text-slate-100 font-mono font-bold">{formatMT(final)} MT</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leg summary */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Leg-by-Leg Summary</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Leg</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                {activeGradeIds.map(id => {
                  const grade = fuelGrades.find(g => g.id === id)
                  const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                  return <th key={id} className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${colors.text}`}>{grade?.label ?? id}</th>
                })}
                {activeGradeIds.map(id => {
                  const grade = fuelGrades.find(g => g.id === id)
                  const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                  return <th key={`rob-${id}`} className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider ${colors.text} opacity-60`}>ROB {grade?.label ?? id}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const result = calc.legResults.find(r => r.legId === leg.id)
                if (!result) return null
                const totalHours = result.consumption.seaHoursTotal + result.consumption.portHours
                return (
                  <tr key={leg.id} className="border-b border-slate-700/30">
                    <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-200">
                      {leg.name}
                      {leg.blendMode?.enabled && <span className="ml-1.5 text-xs text-violet-400">[Blend]</span>}
                      {leg.ecaZone?.enabled && <span className="ml-1.5 text-xs text-emerald-400">[ECA]</span>}
                      {result.warnings.length > 0 && <span className="ml-1.5 text-xs text-amber-400">⚠</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400 font-mono text-xs">{formatHours(totalHours)}</td>
                    {activeGradeIds.map(id => {
                      const qty = result.consumption.total[id] ?? 0
                      const grade = fuelGrades.find(g => g.id === id)
                      const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                      return (
                        <td key={id} className="px-3 py-2.5 text-right">
                          {qty > 0 ? <span className={`font-mono text-sm ${colors.text}`}>{formatMT(qty)}</span> : <span className="text-slate-600">—</span>}
                        </td>
                      )
                    })}
                    {activeGradeIds.map(id => {
                      const rob = result.robByGradeAtEnd[id] ?? 0
                      return (
                        <td key={`rob-${id}`} className="px-3 py-2.5 text-right">
                          <span className="font-mono text-sm text-slate-300">{formatMT(rob)}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* Totals */}
              <tr className="bg-slate-800/50 border-t border-slate-600">
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 font-bold text-slate-100">TOTAL</td>
                <td className="px-3 py-2.5" />
                {activeGradeIds.map(id => {
                  const total = calc.totalConsumptionByGrade[id] ?? 0
                  const grade = fuelGrades.find(g => g.id === id)
                  const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                  return (
                    <td key={id} className="px-3 py-2.5 text-right">
                      <span className={`font-mono font-bold ${colors.text}`}>{formatMT(total)} MT</span>
                    </td>
                  )
                })}
                {activeGradeIds.map(id => {
                  const final = calc.finalRobByGrade[id] ?? 0
                  return (
                    <td key={`rob-${id}`} className="px-3 py-2.5 text-right">
                      <span className="font-mono font-bold text-slate-100">{formatMT(final)} MT</span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tank ROB */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Tank ROB Summary</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                {['Order', 'Tank', 'Grade', 'Capacity', 'Initial ROB', 'Consumed', 'Final ROB'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...vessel.tanks].sort((a, b) => a.consumptionOrder - b.consumptionOrder).map(tank => {
                const grade = fuelGrades.find(g => g.id === tank.fuelGradeId)
                const initialRob = calc.initialTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
                const finalRob = calc.finalTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
                const used = initialRob - finalRob
                const colors = FUEL_COLOR_MAP[grade?.color ?? 'slate']
                return (
                  <tr key={tank.id} className="border-b border-slate-700/30">
                    <td className="px-3 py-2.5 text-slate-500 text-xs">#{tank.consumptionOrder}</td>
                    <td className="px-3 py-2.5 text-slate-200">{tank.name}</td>
                    <td className="px-3 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>{grade?.label ?? tank.fuelGradeId}</span></td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">{formatMT(tank.capacityMT)}</td>
                    <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">{formatMT(initialRob)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs"><span className={used > 0 ? colors.text : 'text-slate-500'}>{used > 0 ? formatMT(used) : '—'}</span></td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold"><span className={finalRob < initialRob * 0.1 && finalRob > 0 ? 'text-amber-400' : 'text-slate-100'}>{formatMT(finalRob)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
