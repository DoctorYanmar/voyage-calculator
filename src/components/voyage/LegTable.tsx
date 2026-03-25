import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Anchor, Building2, GitBranch } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVoyageStore } from '../../store/voyageStore'
import { useVesselStore } from '../../store/vesselStore'
import { FuelBadge } from '../shared/Badge'
import { LegModal } from './LegModal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { EmptyState } from '../shared/EmptyState'
import type { VoyageLeg } from '../../types'
import { LEG_TYPE_LABELS } from '../../constants/defaults'
import { formatHours } from '../../lib/calculations'

const LEG_ICONS: Record<string, React.ElementType> = {
  sea: Anchor,
  port: Building2,
  anchorage: Anchor,
  canal: GitBranch,
  drifting: Anchor,
}

function ModeBadge({ leg }: { leg: VoyageLeg }) {
  if (leg.blendMode?.enabled) {
    return <span className="text-xs bg-violet-900/40 border border-violet-700/40 text-violet-300 px-1.5 py-0.5 rounded">Blend</span>
  }
  if (leg.ecaZone?.enabled) {
    return <span className="text-xs bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 px-1.5 py-0.5 rounded">ECA</span>
  }
  return null
}

function SortableLegRow({
  leg,
  onEdit,
  onDelete,
}: { leg: VoyageLeg; onEdit: () => void; onDelete: () => void }) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const blends = useVoyageStore(s => s.voyage?.blendLibrary ?? [])
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: leg.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSeaLeg = leg.type === 'sea' || leg.type === 'canal' || leg.type === 'drifting'
  const estHours = isSeaLeg && leg.distanceNm && leg.speedKnots
    ? leg.distanceNm / leg.speedKnots
    : (leg.durationHours ?? 0)

  const Icon = LEG_ICONS[leg.type] ?? Anchor

  const fuelLabels = (() => {
    if (leg.blendMode?.enabled) {
      const blend = blends.find(b => b.id === leg.blendMode!.blendId)
      return blend ? [blend.label] : ['Blend']
    }
    const grades = new Set<string>()
    leg.fuelStreams.forEach(s => grades.add(s.fuelGradeId))
    if (leg.ecaZone?.enabled) grades.add(leg.ecaZone.ecaFuelGradeId)
    return Array.from(grades)
  })()

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-slate-700/50 hover:bg-slate-800/50 group transition-colors">
      <td className="px-2 py-3 w-8">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div>
            <span className="text-slate-200 font-medium text-sm">{leg.name}</span>
            <span className="text-slate-500 text-xs ml-2">{LEG_TYPE_LABELS[leg.type]}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-slate-400 font-mono">
        {isSeaLeg && leg.distanceNm ? `${leg.distanceNm} nm` : '—'}
        {isSeaLeg && leg.speedKnots && leg.distanceNm ? <span className="text-slate-600 text-xs ml-1">@ {leg.speedKnots} kn</span> : null}
      </td>
      <td className="px-3 py-3 text-sm text-slate-400 font-mono">
        {estHours > 0 ? formatHours(estHours) : '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {fuelLabels.map(id => (
            leg.blendMode?.enabled
              ? <span key={id} className="text-xs bg-violet-900/30 text-violet-300 border border-violet-700/30 px-1.5 py-0.5 rounded">{id}</span>
              : <FuelBadge key={id} fuelGradeId={id} />
          ))}
          <ModeBadge leg={leg} />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button onClick={onEdit} className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function LegTable() {
  const voyage = useVoyageStore(s => s.voyage)
  const deleteLeg = useVoyageStore(s => s.deleteLeg)
  const reorderLegs = useVoyageStore(s => s.reorderLegs)

  const [modalOpen, setModalOpen] = useState(false)
  const [editLeg, setEditLeg] = useState<VoyageLeg | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const legs = (voyage?.legs ?? []).slice().sort((a, b) => a.order - b.order)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = legs.findIndex(l => l.id === active.id)
    const newIdx = legs.findIndex(l => l.id === over.id)
    reorderLegs(arrayMove(legs, oldIdx, newIdx).map(l => l.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">
          {legs.length} {legs.length === 1 ? 'leg' : 'legs'} • drag to reorder
        </p>
        <button
          onClick={() => { setEditLeg(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Leg
        </button>
      </div>

      {legs.length === 0 ? (
        <EmptyState
          icon={Anchor}
          title="No voyage legs defined"
          description="Add sea passages, port stays, and canal transits to plan your voyage."
          action={
            <button
              onClick={() => { setEditLeg(undefined); setModalOpen(true) }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add first leg
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Leg</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Distance</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fuel</th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={legs.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {legs.map(leg => (
                    <SortableLegRow
                      key={leg.id}
                      leg={leg}
                      onEdit={() => { setEditLeg(leg); setModalOpen(true) }}
                      onDelete={() => setDeleteId(leg.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      <LegModal open={modalOpen} onClose={() => setModalOpen(false)} editLeg={editLeg} />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete leg"
        message="This will remove the leg and any bunker events associated with it."
        onConfirm={() => { if (deleteId) deleteLeg(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
