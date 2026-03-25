import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVesselStore } from '../../store/vesselStore'
import { FuelBadge } from '../shared/Badge'
import { TankModal } from './TankModal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Tank } from '../../types'
import { EmptyState } from '../shared/EmptyState'

function SortableTankRow({
  tank,
  onEdit,
  onDelete,
}: {
  tank: Tank
  onEdit: (t: Tank) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tank.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const fillPct = tank.capacityMT > 0 ? Math.round((tank.robMT / tank.capacityMT) * 100) : 0
  const fillColor = fillPct > 60 ? 'bg-green-500' : fillPct > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-slate-700/50 hover:bg-slate-800/50 group transition-colors"
    >
      <td className="px-2 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-3">
        <span className="text-slate-200 font-medium text-sm">{tank.name}</span>
        {tank.notes && (
          <span className="text-slate-500 text-xs block">{tank.notes}</span>
        )}
      </td>
      <td className="px-3 py-3">
        <FuelBadge fuelGradeId={tank.fuelGradeId} />
      </td>
      <td className="px-3 py-3 text-right">
        <span className="text-slate-300 text-sm font-mono">{tank.capacityMT.toFixed(1)}</span>
        <span className="text-slate-500 text-xs ml-1">MT</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-[60px] h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillColor}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-slate-300 text-sm font-mono w-16 text-right">
            {tank.robMT.toFixed(1)}
          </span>
          <span className="text-slate-500 text-xs">MT</span>
        </div>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="text-slate-400 text-xs font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">
          #{tank.consumptionOrder}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button
            onClick={() => onEdit(tank)}
            className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(tank.id)}
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function TankTable() {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const deleteTank = useVesselStore(s => s.deleteTank)
  const reorderTanks = useVesselStore(s => s.reorderTanks)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTank, setEditTank] = useState<Tank | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const tanks = vessel ? [...vessel.tanks].sort((a, b) => a.consumptionOrder - b.consumptionOrder) : []

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = tanks.findIndex(t => t.id === active.id)
    const newIdx = tanks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tanks, oldIdx, newIdx)
    reorderTanks(reordered.map(t => t.id))
  }

  if (!vessel) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No vessel selected"
        description="Create or select a vessel from the top navigation to manage tanks."
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-500 text-sm">
            {tanks.length} {tanks.length === 1 ? 'tank' : 'tanks'} • drag rows to set consumption order
          </p>
        </div>
        <button
          onClick={() => { setEditTank(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tank
        </button>
      </div>

      {tanks.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No tanks added yet"
          description="Add tanks for this vessel to start tracking fuel consumption."
          action={
            <button
              onClick={() => { setEditTank(undefined); setModalOpen(true) }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add first tank
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tank</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Grade</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Capacity</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Initial ROB</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tanks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {tanks.map(tank => (
                    <SortableTankRow
                      key={tank.id}
                      tank={tank}
                      onEdit={t => { setEditTank(t); setModalOpen(true) }}
                      onDelete={id => setDeleteId(id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      <TankModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editTank={editTank}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tank"
        message="This will remove the tank and its ROB data. Cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) deleteTank(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
