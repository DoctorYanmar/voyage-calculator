import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useVesselStore } from '../../store/vesselStore'
import { AVAILABLE_COLORS, FUEL_COLOR_MAP } from '../../constants/fuelGrades'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { FuelGrade } from '../../types'

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {AVAILABLE_COLORS.map(c => {
        const cl = FUEL_COLOR_MAP[c]
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${cl.bg} ${
              value === c ? 'border-white scale-110' : 'border-transparent hover:border-slate-400'
            }`}
          />
        )
      })}
    </div>
  )
}

function GradeRow({ grade }: { grade: FuelGrade }) {
  const updateFuelGrade = useVesselStore(s => s.updateFuelGrade)
  const deleteFuelGrade = useVesselStore(s => s.deleteFuelGrade)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ label: grade.label, sulfurPct: grade.sulfurPct, color: grade.color, isEcaCompliant: grade.isEcaCompliant })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const colors = FUEL_COLOR_MAP[grade.color] ?? FUEL_COLOR_MAP['slate']

  const save = () => {
    updateFuelGrade(grade.id, form)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-700/50 bg-slate-800/80">
        <td className="px-3 py-2">
          <input
            type="text"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 w-full focus:outline-none focus:border-blue-500"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            value={form.sulfurPct}
            onChange={e => setForm(f => ({ ...f, sulfurPct: parseFloat(e.target.value) || 0 }))}
            step="0.1"
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 w-20 focus:outline-none focus:border-blue-500"
          />
        </td>
        <td className="px-3 py-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isEcaCompliant}
              onChange={e => setForm(f => ({ ...f, isEcaCompliant: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-blue-500"
            />
            <span className="text-xs text-slate-400">ECA OK</span>
          </label>
        </td>
        <td className="px-3 py-2">
          <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={save} className="p-1.5 rounded text-green-400 hover:bg-slate-700"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded text-slate-400 hover:bg-slate-700"><X className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-800/50 group">
      <td className="px-3 py-2.5">
        <span className={`text-sm font-medium px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
          {grade.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-slate-300 font-mono">{grade.sulfurPct}%</td>
      <td className="px-3 py-2.5">
        {grade.isEcaCompliant
          ? <span className="text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-1.5 py-0.5 rounded">ECA ✓</span>
          : <span className="text-xs text-slate-500">—</span>
        }
      </td>
      <td className="px-3 py-2.5">
        <div className={`w-4 h-4 rounded-full ${colors.bg} border ${colors.border}`} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!grade.builtIn && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete fuel grade"
        message={`Delete "${grade.label}"? This may break legs that use it.`}
        onConfirm={() => { deleteFuelGrade(grade.id); setDeleteOpen(false) }}
        onCancel={() => setDeleteOpen(false)}
      />
    </tr>
  )
}

export function FuelGradesPanel() {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const addFuelGrade = useVesselStore(s => s.addFuelGrade)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', sulfurPct: 0.1, isEcaCompliant: true, color: 'slate', density: 0.85 })

  const handleAdd = () => {
    if (!form.label.trim()) return
    addFuelGrade(form)
    setForm({ label: '', sulfurPct: 0.1, isEcaCompliant: true, color: 'slate', density: 0.85 })
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Fuel Grades</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add grade
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-700">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Grade</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Sulfur %</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ECA</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Color</th>
              <th className="px-3 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {fuelGrades.map(g => <GradeRow key={g.id} grade={g} />)}
            {adding && (
              <tr className="border-b border-slate-700/50 bg-slate-800/80">
                <td className="px-3 py-2">
                  <input
                    autoFocus
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                    placeholder="e.g. ULSFO 0.1%"
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 w-full focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={form.sulfurPct}
                    onChange={e => setForm(f => ({ ...f, sulfurPct: parseFloat(e.target.value) || 0 }))}
                    step="0.1"
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 w-20 focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.isEcaCompliant}
                    onChange={e => setForm(f => ({ ...f, isEcaCompliant: e.target.checked }))}
                    className="accent-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={handleAdd} className="p-1.5 rounded text-green-400 hover:bg-slate-700"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAdding(false)} className="p-1.5 rounded text-slate-400 hover:bg-slate-700"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
