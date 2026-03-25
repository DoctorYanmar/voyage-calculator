import { useState } from 'react'
import { Pencil, Check, X, Map } from 'lucide-react'
import { useVoyageStore } from '../../store/voyageStore'
import { useVesselStore } from '../../store/vesselStore'
import { LegTable } from './LegTable'
import { BunkerTable } from './BunkerTable'
import { BlendLibrary } from './BlendLibrary'
import { EmptyState } from '../shared/EmptyState'

export function VoyagePanel() {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const voyage = useVoyageStore(s => s.voyage)
  const updateMeta = useVoyageStore(s => s.updateVoyageMeta)

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')

  if (!vessel) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Map}
          title="No vessel selected"
          description="Select or create a vessel from the top navigation before planning a voyage."
        />
      </div>
    )
  }

  if (!voyage) return null

  const totalLegs = voyage.legs.length
  const seaLegs = voyage.legs.filter(l => l.type === 'sea' || l.type === 'canal' || l.type === 'drifting')
  const totalDist = seaLegs.reduce((s, l) => s + (l.distanceNm ?? 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-700/40 flex items-center justify-center mt-0.5">
            <Map className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateMeta({ name: nameVal.trim() || voyage.name }); setEditingName(false) }
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-lg font-bold text-slate-100 focus:outline-none"
                />
                <button onClick={() => { updateMeta({ name: nameVal.trim() || voyage.name }); setEditingName(false) }} className="p-1 rounded text-green-400 hover:bg-slate-700"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingName(false)} className="p-1 rounded text-slate-400 hover:bg-slate-700"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">{voyage.name}</h1>
                <button onClick={() => { setNameVal(voyage.name); setEditingName(true) }} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <p className="text-slate-500 text-sm">on {vessel.name}</p>
          </div>
        </div>

        <div className="hidden md:flex gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Legs</p>
            <p className="text-xl font-bold text-slate-200">{totalLegs}</p>
          </div>
          {totalDist > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Dist</p>
              <p className="text-xl font-bold text-slate-200">{totalDist.toLocaleString()} <span className="text-sm font-normal text-slate-400">nm</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legs — 2/3 */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-200 mb-3">Voyage Legs</h2>
          <LegTable />
        </div>

        {/* Right column — 1/3 */}
        <div className="flex flex-col gap-6">
          <BunkerTable />
          <BlendLibrary />
        </div>
      </div>
    </div>
  )
}
