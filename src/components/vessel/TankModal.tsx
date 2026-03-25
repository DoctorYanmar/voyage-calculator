import { useState, useEffect } from 'react'
import { Modal, FormField, FormRow, SectionLabel, Btn, TextInput, SelectInput } from '../shared/Modal'
import { NumericInput } from '../shared/NumericInput'
import { useVesselStore } from '../../store/vesselStore'
import type { Tank } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  editTank?: Tank
}

const EMPTY: Omit<Tank, 'id' | 'consumptionOrder'> = {
  name: '',
  fuelGradeId: '',
  capacityMT: 500,
  robMT: 0,
  notes: '',
}

export function TankModal({ open, onClose, editTank }: Props) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const addTank = useVesselStore(s => s.addTank)
  const updateTank = useVesselStore(s => s.updateTank)

  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) {
      setForm(editTank ? {
        name: editTank.name,
        fuelGradeId: editTank.fuelGradeId,
        capacityMT: editTank.capacityMT,
        robMT: editTank.robMT,
        notes: editTank.notes ?? '',
      } : { ...EMPTY, fuelGradeId: fuelGrades[0]?.id ?? '' })
    }
  }, [open, editTank, fuelGrades])

  const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const valid = form.name.trim() && form.fuelGradeId && form.capacityMT > 0

  const handleSave = () => {
    if (!valid) return
    if (editTank) {
      updateTank(editTank.id, form)
    } else {
      addTank(form)
    }
    onClose()
  }

  const gradeOptions = fuelGrades.map(g => ({ value: g.id, label: g.label }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTank ? 'Edit Tank' : 'Add Tank'}
      subtitle="Define tank parameters for this vessel"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!valid}>
            {editTank ? 'Save Changes' : 'Add Tank'}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormRow>
          <FormField label="Tank Name" required className="col-span-2">
            <TextInput
              value={form.name}
              onChange={v => set('name', v)}
              placeholder="e.g. HFO P, Settling SB, MGO Day Tank"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Fuel Grade" required>
            <SelectInput
              value={form.fuelGradeId}
              onChange={v => set('fuelGradeId', v)}
              options={gradeOptions}
            />
          </FormField>
          <FormField label="Capacity" required hint="Maximum capacity in MT">
            <NumericInput
              value={form.capacityMT}
              onChange={v => set('capacityMT', v)}
              unit="MT"
              min={0}
            />
          </FormField>
        </FormRow>

        <FormField label="Initial ROB" hint="Quantity on board at start of voyage (MT)">
          <NumericInput
            value={form.robMT}
            onChange={v => set('robMT', Math.min(v, form.capacityMT))}
            unit="MT"
            min={0}
            max={form.capacityMT}
          />
          {form.robMT > 0 && form.capacityMT > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min((form.robMT / form.capacityMT) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">
                {Math.round((form.robMT / form.capacityMT) * 100)}%
              </span>
            </div>
          )}
        </FormField>

        <FormField label="Notes" hint="Optional (frame location, grade spec, etc.)">
          <TextInput
            value={form.notes ?? ''}
            onChange={v => set('notes', v)}
            placeholder="Optional notes…"
          />
        </FormField>
      </div>
    </Modal>
  )
}
