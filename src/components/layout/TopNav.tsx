import { useState, useRef } from 'react'
import { Ship, Download, Upload, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '../shared/ConfirmDialog'

export function TopNav() {
  const vessels = useVesselStore(s => s.vessels)
  const activeVesselId = useVesselStore(s => s.activeVesselId)
  const addVessel = useVesselStore(s => s.addVessel)
  const deleteVessel = useVesselStore(s => s.deleteVessel)
  const setActiveVessel = useVesselStore(s => s.setActiveVessel)
  const exportVesselData = useVesselStore(s => s.exportData)
  const importVesselData = useVesselStore(s => s.importData)
  const voyage = useVoyageStore(s => s.voyage)
  const exportVoyage = useVoyageStore(s => s.exportVoyage)
  const importVoyage = useVoyageStore(s => s.importVoyage)
  const initVoyage = useVoyageStore(s => s.initVoyage)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [newVesselName, setNewVesselName] = useState('')
  const [addingVessel, setAddingVessel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voyageFileRef = useRef<HTMLInputElement>(null)

  const activeVessel = vessels.find(v => v.id === activeVesselId)

  const handleAddVessel = () => {
    if (!newVesselName.trim()) return
    const id = addVessel(newVesselName.trim())
    initVoyage(id)
    setNewVesselName('')
    setAddingVessel(false)
    setDropdownOpen(false)
    toast.success(`Vessel "${newVesselName.trim()}" created`)
  }

  const handleExportAll = () => {
    const vesselData = exportVesselData()
    const voyageData = exportVoyage()
    const combined = JSON.stringify({ vessels: JSON.parse(vesselData), voyage: JSON.parse(voyageData || 'null') }, null, 2)
    download(combined, `voyagefuel-export-${dateStr()}.json`)
    toast.success('Data exported')
  }

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.vessels) importVesselData(JSON.stringify(data.vessels))
        if (data.voyage) importVoyage(JSON.stringify(data.voyage))
        toast.success('Data imported successfully')
      } catch {
        toast.error('Invalid file format')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700/80 flex items-center px-4 gap-4 shrink-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Ship className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-100 text-[15px] tracking-tight hidden sm:block">
          VoyageFuel
        </span>
      </div>

      {/* Vessel selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-slate-600 transition-colors min-w-[160px]"
        >
          <Ship className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate flex-1 text-left">
            {activeVessel?.name ?? <span className="text-slate-500">No vessel</span>}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {vessels.length > 0 && (
              <div className="py-1 border-b border-slate-700">
                {vessels.map(v => (
                  <div
                    key={v.id}
                    className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 cursor-pointer group ${v.id === activeVesselId ? 'bg-slate-700/30' : ''}`}
                    onClick={() => {
                      setActiveVessel(v.id)
                      initVoyage(v.id)
                      setDropdownOpen(false)
                    }}
                  >
                    <Ship className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-200 flex-1 truncate">{v.name}</span>
                    {v.id === activeVesselId && (
                      <span className="text-xs text-blue-400 font-medium">Active</span>
                    )}
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-all"
                      onClick={e => { e.stopPropagation(); setConfirmDelete(v.id) }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2">
              {addingVessel ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newVesselName}
                    onChange={e => setNewVesselName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddVessel(); if (e.key === 'Escape') setAddingVessel(false) }}
                    placeholder="Vessel name…"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={handleAddVessel} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500">Add</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingVessel(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 text-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add new vessel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Voyage name display */}
      {voyage && (
        <span className="text-slate-500 text-sm hidden md:block truncate max-w-[200px]">
          {voyage.name}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportAll}
          title="Export all data as JSON"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Export</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import data from JSON"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Import</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportAll} />
        <input ref={voyageFileRef} type="file" accept=".json" className="hidden" />
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete vessel"
        message="This will permanently delete the vessel and cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) deleteVessel(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </header>
  )
}

function dateStr() {
  return new Date().toISOString().slice(0, 10)
}

function download(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  a.download = filename
  a.click()
}
