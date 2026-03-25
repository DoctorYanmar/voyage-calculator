import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { Modal, FormField, FormRow, Btn, TextInput, SelectInput } from '../shared/Modal'
import { NumericInput } from '../shared/NumericInput'
import { FuelBadge } from '../shared/Badge'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { BunkerEvent } from '../../types'

function BunkerModal({ open, onClose, editEvent }: { open: boolean; onClose: () => void; editEvent?: BunkerEvent }) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const voyage = useVoyageStore(s => s.voyage)
  const addBunker = useVoyageStore(s => s.addBunkerEvent)
  const updateBunker = useVoyageStore(s => s.updateBunkerEvent)

  const legs = voyage?.legs.slice().sort((a, b) => a.order - b.order) ?? []

  const [afterLegId, setAfterLegId] = useState(editEvent?.afterLegId ?? legs[0]?.id ?? '')
  const [port, setPort] = useState(editEvent?.port ?? '')
  const [notes, setNotes] = useState(editEvent?.notes ?? '')
  const [quantities, setQuantities] = useState<Record<string, number>>(
    editEvent?.quantities ?? {}
  )

  const setQty = (gradeId: string, val: number) =>
    setQuantities(q => ({ ...q, [gradeId]: val }))

  const valid = afterLegId && Object.values(quantities).some(v => v > 0)

  const handleSave = () => {
    if (!valid) return
    const data = { afterLegId, port, notes, quantities }
    if (editEvent) updateBunker(editEvent.id, data)
    else addBunker(data)
    onClose()
  }

  const legOpts = legs.map(l => ({ value: l.id, label: `After: ${l.name}` }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editEvent ? 'Edit Bunker Event' : 'Add Bunker Event'}
      subtitle="Fuel received during the voyage"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!valid}>
            {editEvent ? 'Save' : 'Add'}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormRow>
          <FormField label="Received After Leg" required>
            <SelectInput value={afterLegId} onChange={setAfterLegId} options={legOpts} />
          </FormField>
          <FormField label="Port / Location">
            <TextInput value={port} onChange={setPort} placeholder="e.g. Rotterdam" />
          </FormField>
        </FormRow>

        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Quantities Received</p>
          <div className="grid grid-cols-2 gap-2">
            {fuelGrades.map(g => (
              <FormField key={g.id} label={g.label} hint="MT (0 = not bunkered)">
                <NumericInput
                  value={quantities[g.id] ?? 0}
                  onChange={v => setQty(g.id, v)}
                  unit="MT"
                  min={0}
                />
              </FormField>
            ))}
          </div>
        </div>

        <FormField label="Notes">
          <TextInput value={notes} onChange={setNotes} placeholder="Optional notes…" />
        </FormField>
      </div>
    </Modal>
  )
}

export function BunkerTable() {
  const voyage = useVoyageStore(s => s.voyage)
  const deleteBunker = useVoyageStore(s => s.deleteBunkerEvent)
  const fuelGrades = useVesselStore(s => s.fuelGrades)

  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<BunkerEvent | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const legs = voyage?.legs.slice().sort((a, b) => a.order - b.order) ?? []
  const bunkers = voyage?.bunkerEvents ?? []

  const legName = (id: string) => legs.find(l => l.id === id)?.name ?? id

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Bunker Events</h3>
          <p className="text-xs text-slate-500 mt-0.5">Fuel received during the voyage</p>
        </div>
        <button
          onClick={() => { setEditEvent(undefined); setModalOpen(true) }}
          disabled={legs.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add bunker
        </button>
      </div>

      {bunkers.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">No bunker events</p>
          <p className="text-slate-600 text-xs mt-1">Add when fuel is received mid-voyage</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">After Leg</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Port</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantities</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {bunkers.map(b => (
                <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 group">
                  <td className="px-3 py-2.5 text-sm text-slate-300">{legName(b.afterLegId)}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-400">{b.port || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(b.quantities).filter(([, v]) => v > 0).map(([gradeId, qty]) => (
                        <span key={gradeId} className="text-xs text-slate-300 bg-slate-700/50 border border-slate-600 px-2 py-0.5 rounded">
                          {fuelGrades.find(g => g.id === gradeId)?.label ?? gradeId}: <strong>{qty} MT</strong>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => { setEditEvent(b); setModalOpen(true) }} className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BunkerModal open={modalOpen} onClose={() => setModalOpen(false)} editEvent={editEvent} />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete bunker event"
        message="This will remove the bunker entry. Cannot be undone."
        onConfirm={() => { if (deleteId) deleteBunker(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
