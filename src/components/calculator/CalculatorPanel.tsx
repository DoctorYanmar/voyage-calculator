import { Calculator, AlertTriangle, Ship } from 'lucide-react'
import { useCalculations } from '../../hooks/useCalculations'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { useUiStore } from '../../store/uiStore'
import { FuelSummaryCards } from './FuelSummaryCards'
import { TankROBTable } from './TankROBTable'
import { LegBreakdownTable } from './LegBreakdownTable'
import { EmptyState } from '../shared/EmptyState'

export function CalculatorPanel() {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const voyage = useVoyageStore(s => s.voyage)
  const calc = useCalculations()
  const setTab = useUiStore(s => s.setActiveTab)

  if (!vessel) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Ship}
          title="No vessel selected"
          description="Set up a vessel with tanks to start calculating."
          action={
            <button onClick={() => setTab('vessel')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              Go to Vessel Setup
            </button>
          }
        />
      </div>
    )
  }

  if (!voyage || voyage.legs.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Calculator}
          title="No voyage legs defined"
          description="Add legs to your voyage plan to see fuel calculations."
          action={
            <button onClick={() => setTab('voyage')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              Go to Voyage Plan
            </button>
          }
        />
      </div>
    )
  }

  if (!calc) return null

  const hasWarnings = calc.allWarnings.length > 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Fuel Calculations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {vessel.name} · {voyage.name} · {voyage.legs.length} legs
          </p>
        </div>
        {hasWarnings && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-700/40 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">{calc.allWarnings.length} warning{calc.allWarnings.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Warnings banner */}
      {hasWarnings && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl">
          <p className="text-xs font-semibold text-amber-400 mb-1.5 uppercase tracking-wide">Warnings</p>
          <ul className="flex flex-col gap-1">
            {calc.allWarnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-300">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Fuel Summary Cards */}
      <FuelSummaryCards calc={calc} />

      {/* Two-column: Tank ROB + breakdown */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Tank ROB — left panel, narrower */}
        <div className="xl:col-span-1">
          <TankROBTable calc={calc} vessel={vessel} />
        </div>

        {/* Leg breakdown — right panel, wider */}
        <div className="xl:col-span-3">
          <LegBreakdownTable calc={calc} voyage={voyage} vessel={vessel} />
        </div>
      </div>
    </div>
  )
}
