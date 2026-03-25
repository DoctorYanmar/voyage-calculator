import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { Modal, FormField, Btn, TextInput, SelectInput } from '../shared/Modal'
import { NumericInput } from '../shared/NumericInput'
import type { FuelBlend } from '../../types'
import { EmptyState } from '../shared/EmptyState'

interface BlendFormState {
  label: string
  streams: Array<{ fuelGradeId: string; ratio: number; tankIds: string[] }>
}

function BlendFormModal({
  open, onClose, editBlend
}: { open: boolean; onClose: () => void; editBlend?: FuelBlend }) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const vessel = useVesselStore(s => s.getActiveVessel())
  const addBlend = useVoyageStore(s => s.addBlend)
  const updateBlend = useVoyageStore(s => s.updateBlend)

  const gradeOpts = fuelGrades.map(g => ({ value: g.id, label: g.label }))
  const defaultGrade = fuelGrades[0]?.id ?? ''

  const [form, setForm] = useState<BlendFormState>(
    editBlend
      ? { label: editBlend.label, streams: editBlend.streams.map(s => ({ ...s })) }
      : { label: '', streams: [{ fuelGradeId: defaultGrade, ratio: 0.9, tankIds: [] }, { fuelGradeId: defaultGrade, ratio: 0.1, tankIds: [] }] }
  )

  const totalRatio = form.streams.reduce((s, r) => s + r.ratio, 0)
  const ratioOk = Math.abs(totalRatio - 1) < 0.001

  const updateStream = (i: number, key: string, val: any) =>
    setForm(f => ({ ...f, streams: f.streams.map((s, j) => j === i ? { ...s, [key]: val } : s) }))

  const toggleTank = (streamIdx: number, tankId: string) => {
    const current = form.streams[streamIdx].tankIds
    updateStream(streamIdx, 'tankIds', current.includes(tankId) ? current.filter(t => t !== tankId) : [...current, tankId])
  }

  const valid = form.label.trim() && form.streams.length >= 2 && ratioOk

  const handleSave = () => {
    if (!valid) return
    if (editBlend) updateBlend(editBlend.id, { label: form.label, streams: form.streams })
    else addBlend({ label: form.label, streams: form.streams })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editBlend ? 'Edit Blend' : 'Define Fuel Blend'}
      subtitle="Define simultaneous multi-grade fuel consumption ratio"
      maxWidth="max-w-lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!valid}>
            {editBlend ? 'Save' : 'Add Blend'}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Blend Name" required>
          <TextInput value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. VLSFO/HFO 90:10" />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">Fuel Streams</p>
            <button
              onClick={() => setForm(f => ({ ...f, streams: [...f.streams, { fuelGradeId: defaultGrade, ratio: 0, tankIds: [] }] }))}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-3 h-3" /> Add stream
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {form.streams.map((s, i) => {
              const gradeTanks = vessel?.tanks.filter(t => t.fuelGradeId === s.fuelGradeId) ?? []
              return (
                <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SelectInput
                        value={s.fuelGradeId}
                        onChange={v => updateStream(i, 'fuelGradeId', v)}
                        options={gradeOpts}
                      />
                    </div>
                    <div className="w-24">
                      <NumericInput
                        value={Math.round(s.ratio * 100)}
                        onChange={v => updateStream(i, 'ratio', v / 100)}
                        unit="%"
                        min={0}
                        max={100}
                      />
                    </div>
                    {form.streams.length > 2 && (
                      <button onClick={() => setForm(f => ({ ...f, streams: f.streams.filter((_, j) => j !== i) }))} className="p-1 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {gradeTanks.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {gradeTanks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => toggleTank(i, t.id)}
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                            s.tankIds.includes(t.id)
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                              : 'bg-slate-700/50 border-slate-600 text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className={`mt-2 text-xs px-2 py-1 rounded ${ratioOk ? 'text-green-400 bg-green-950/30' : 'text-amber-400 bg-amber-950/30'}`}>
            Total: {Math.round(totalRatio * 100)}% {ratioOk ? '✓' : `— must equal 100% (${Math.round((1 - totalRatio) * 100)} remaining)`}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function BlendLibrary() {
  const blends = useVoyageStore(s => s.voyage?.blendLibrary ?? [])
  const deleteBlend = useVoyageStore(s => s.deleteBlend)
  const fuelGrades = useVesselStore(s => s.fuelGrades)

  const [modalOpen, setModalOpen] = useState(false)
  const [editBlend, setEditBlend] = useState<FuelBlend | undefined>()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Blend Library</h3>
          <p className="text-xs text-slate-500 mt-0.5">Reusable simultaneous multi-fuel consumption ratios</p>
        </div>
        <button
          onClick={() => { setEditBlend(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Define blend
        </button>
      </div>

      {blends.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">No blends defined</p>
          <p className="text-slate-600 text-xs mt-1">Use when vessel consumes two fuels simultaneously at a fixed ratio (e.g. VLSFO 90% + HFO 10%)</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blends.map(blend => (
            <div key={blend.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 group">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">{blend.label}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {blend.streams.map(s => {
                    const g = fuelGrades.find(f => f.id === s.fuelGradeId)
                    return (
                      <span key={s.fuelGradeId} className="text-xs text-slate-400 bg-slate-700/50 border border-slate-600 px-1.5 py-0.5 rounded">
                        {g?.label ?? s.fuelGradeId} <strong className="text-slate-300">{Math.round(s.ratio * 100)}%</strong>
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditBlend(blend); setModalOpen(true) }} className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteBlend(blend.id)} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BlendFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editBlend={editBlend}
      />
    </div>
  )
}
