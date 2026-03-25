import { useState } from 'react'
import { Ship, Pencil, Check, X } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { TankTable } from './TankTable'
import { FuelGradesPanel } from './FuelGradesPanel'
import { EmptyState } from '../shared/EmptyState'
import { useUiStore } from '../../store/uiStore'

export function VesselPanel() {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const updateVessel = useVesselStore(s => s.updateVessel)
  const setTab = useUiStore(s => s.setActiveTab)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [imoValue, setImoValue] = useState('')

  const startEditName = () => {
    setNameValue(vessel?.name ?? '')
    setImoValue(vessel?.imoNumber ?? '')
    setEditingName(true)
  }

  const saveVesselMeta = () => {
    if (!vessel) return
    updateVessel(vessel.id, { name: nameValue.trim() || vessel.name, imoNumber: imoValue.trim() || undefined })
    setEditingName(false)
  }

  if (!vessel) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Ship}
          title="No vessel selected"
          description="Add a new vessel from the top navigation to get started."
        />
      </div>
    )
  }

  const totalCapacity = vessel.tanks.reduce((s, t) => s + t.capacityMT, 0)
  const totalROB = vessel.tanks.reduce((s, t) => s + t.robMT, 0)
  const tanksByGrade = vessel.tanks.reduce<Record<string, number>>((acc, t) => {
    acc[t.fuelGradeId] = (acc[t.fuelGradeId] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Vessel header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-700/40 flex items-center justify-center mt-0.5">
            <Ship className="w-5 h-5 text-blue-400" />
          </div>
          {editingName ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveVesselMeta(); if (e.key === 'Escape') setEditingName(false) }}
                className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-lg font-bold text-slate-100 focus:outline-none"
              />
              <input
                type="text"
                value={imoValue}
                onChange={e => setImoValue(e.target.value)}
                placeholder="IMO number (optional)"
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button onClick={saveVesselMeta} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditingName(false)} className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">{vessel.name}</h1>
                <button
                  onClick={startEditName}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              {vessel.imoNumber && (
                <p className="text-slate-500 text-sm">IMO {vessel.imoNumber}</p>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="hidden md:flex gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Tanks</p>
            <p className="text-xl font-bold text-slate-200">{vessel.tanks.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total ROB</p>
            <p className="text-xl font-bold text-slate-200">{totalROB.toFixed(1)} <span className="text-sm font-normal text-slate-400">MT</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Capacity</p>
            <p className="text-xl font-bold text-slate-200">{totalCapacity.toFixed(1)} <span className="text-sm font-normal text-slate-400">MT</span></p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tanks — takes 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-slate-200">Tanks</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              consumption order = drag row
            </span>
          </div>
          <TankTable />
        </div>

        {/* Fuel grades — takes 1/3 */}
        <div>
          <FuelGradesPanel />

          {/* Quick tip */}
          <div className="mt-4 p-3 bg-blue-950/40 border border-blue-800/30 rounded-xl">
            <p className="text-xs text-blue-300 leading-relaxed">
              <span className="font-semibold">Tip:</span> Set the <em>Initial ROB</em> to the quantity on board at the start of your voyage. The order of tanks in the table defines which tank is drawn first per fuel grade.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
