import { useState, useEffect } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { Modal, FormField, FormRow, SectionLabel, Btn, TextInput, SelectInput } from '../shared/Modal'
import { NumericInput } from '../shared/NumericInput'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { FuelBadge } from '../shared/Badge'
import type { VoyageLeg, FuelStream, LegType } from '../../types'
import { LEG_TYPE_LABELS } from '../../constants/defaults'

interface Props {
  open: boolean
  onClose: () => void
  editLeg?: VoyageLeg
}

type FuelMode = 'standard' | 'eca' | 'blend'

const LEG_TYPE_OPTIONS: { value: LegType; label: string }[] = [
  { value: 'sea', label: 'Sea Passage' },
  { value: 'port', label: 'Port Stay' },
  { value: 'anchorage', label: 'Anchorage' },
  { value: 'canal', label: 'Canal Transit' },
  { value: 'drifting', label: 'Drifting / Slow Steaming' },
]

function TankSelector({
  fuelGradeId,
  selected,
  onChange,
  label,
}: {
  fuelGradeId: string
  selected: string[]
  onChange: (ids: string[]) => void
  label?: string
}) {
  const vessel = useVesselStore(s => s.getActiveVessel())
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const tanks = vessel?.tanks.filter(t => t.fuelGradeId === fuelGradeId).sort((a, b) => a.consumptionOrder - b.consumptionOrder) ?? []

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id))
    else onChange([...selected, id])
  }

  if (tanks.length === 0) return <p className="text-xs text-slate-500 italic">No tanks with this grade</p>

  return (
    <div>
      {label && <p className="text-xs text-slate-500 mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {tanks.map(t => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              selected.includes(t.id)
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-amber-500/80 mt-1">⚠ No tanks selected — will use global order</p>
      )}
    </div>
  )
}

function FuelStreamRow({
  stream,
  index,
  onChange,
  onDelete,
}: {
  stream: FuelStream
  index: number
  onChange: (s: FuelStream) => void
  onDelete: () => void
}) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const gradeOpts = fuelGrades.map(g => ({ value: g.id, label: g.label }))

  return (
    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Stream {index + 1}</span>
        <button onClick={onDelete} className="p-1 rounded text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
      </div>
      <FormRow>
        <FormField label="Fuel Grade">
          <SelectInput
            value={stream.fuelGradeId}
            onChange={v => onChange({ ...stream, fuelGradeId: v })}
            options={gradeOpts}
          />
        </FormField>
        <FormField label="Sea Rate" hint="MT/day">
          <NumericInput value={stream.ratePerDay} onChange={v => onChange({ ...stream, ratePerDay: v })} unit="MT/d" min={0} />
        </FormField>
      </FormRow>
      <FormField label="Port Rate (if different)" hint="Leave 0 to use sea rate for port time">
        <NumericInput value={stream.portRatePerDay ?? 0} onChange={v => onChange({ ...stream, portRatePerDay: v || undefined })} unit="MT/d" min={0} />
      </FormField>
      <TankSelector
        fuelGradeId={stream.fuelGradeId}
        selected={stream.tankIds}
        onChange={ids => onChange({ ...stream, tankIds: ids })}
        label="Draw from tanks (in order):"
      />
    </div>
  )
}

export function LegModal({ open, onClose, editLeg }: Props) {
  const fuelGrades = useVesselStore(s => s.fuelGrades)
  const vessel = useVesselStore(s => s.getActiveVessel())
  const voyage = useVoyageStore(s => s.voyage)
  const addLeg = useVoyageStore(s => s.addLeg)
  const updateLeg = useVoyageStore(s => s.updateLeg)

  const gradeOpts = fuelGrades.map(g => ({ value: g.id, label: g.label }))
  const defaultGradeId = fuelGrades[0]?.id ?? ''

  // ─── Form state ───────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [type, setType] = useState<LegType>('sea')
  const [distance, setDistance] = useState(0)
  const [speed, setSpeed] = useState(12)
  const [durationHours, setDurationHours] = useState(0)
  const [fuelMode, setFuelMode] = useState<FuelMode>('standard')

  // Standard streams
  const [streams, setStreams] = useState<FuelStream[]>([{ fuelGradeId: defaultGradeId, ratePerDay: 50, tankIds: [] }])

  // ECA zone
  const [ecaEnabled, setEcaEnabled] = useState(false)
  const [ecaDist, setEcaDist] = useState(0)
  const [ecaGrade, setEcaGrade] = useState(defaultGradeId)
  const [ecaRate, setEcaRate] = useState(20)
  const [ecaTankIds, setEcaTankIds] = useState<string[]>([])
  const [ecaOverrideEnabled, setEcaOverrideEnabled] = useState(false)
  const [ecaOverrideGrade, setEcaOverrideGrade] = useState(defaultGradeId)
  const [ecaOverrideRate, setEcaOverrideRate] = useState(50)
  const [ecaOverrideTankIds, setEcaOverrideTankIds] = useState<string[]>([])

  // Blend mode
  const [blendId, setBlendId] = useState('')
  const [blendTotal, setBlendTotal] = useState(50)
  const [blendPortTotal, setBlendPortTotal] = useState(0)

  // Populate form from editLeg
  useEffect(() => {
    if (!open) return
    if (editLeg) {
      setName(editLeg.name)
      setType(editLeg.type)
      setDistance(editLeg.distanceNm ?? 0)
      setSpeed(editLeg.speedKnots ?? 12)
      setDurationHours(editLeg.durationHours ?? 0)
      setStreams(editLeg.fuelStreams.length ? editLeg.fuelStreams : [{ fuelGradeId: defaultGradeId, ratePerDay: 50, tankIds: [] }])

      if (editLeg.blendMode?.enabled) {
        setFuelMode('blend')
        setBlendId(editLeg.blendMode.blendId)
        setBlendTotal(editLeg.blendMode.totalRatePerDay)
        setBlendPortTotal(editLeg.blendMode.portTotalRatePerDay ?? 0)
      } else if (editLeg.ecaZone?.enabled) {
        setFuelMode('eca')
        setEcaEnabled(true)
        setEcaDist(editLeg.ecaZone.ecaDistanceNm)
        setEcaGrade(editLeg.ecaZone.ecaFuelGradeId)
        setEcaRate(editLeg.ecaZone.ecaRatePerDay)
        setEcaTankIds(editLeg.ecaZone.ecaTankIds)
        if (editLeg.ecaZone.nonEcaOverride) {
          setEcaOverrideEnabled(true)
          setEcaOverrideGrade(editLeg.ecaZone.nonEcaOverride.fuelGradeId)
          setEcaOverrideRate(editLeg.ecaZone.nonEcaOverride.ratePerDay)
          setEcaOverrideTankIds(editLeg.ecaZone.nonEcaOverride.tankIds)
        }
      } else {
        setFuelMode('standard')
      }
    } else {
      setName('')
      setType('sea')
      setDistance(0)
      setSpeed(12)
      setDurationHours(0)
      setFuelMode('standard')
      setStreams([{ fuelGradeId: defaultGradeId, ratePerDay: 50, tankIds: [] }])
      setEcaEnabled(false)
      setEcaDist(0)
      setEcaGrade(defaultGradeId)
      setEcaRate(20)
      setEcaTankIds([])
      setEcaOverrideEnabled(false)
      setBlendId(voyage?.blendLibrary[0]?.id ?? '')
      setBlendTotal(50)
    }
  }, [open, editLeg, defaultGradeId, voyage?.blendLibrary])

  const isSeaLeg = type === 'sea' || type === 'canal' || type === 'drifting'

  const estHours = isSeaLeg && !durationHours
    ? (distance && speed ? (distance / speed) : 0)
    : durationHours

  const buildLeg = (): Omit<VoyageLeg, 'id' | 'order'> => {
    const base = {
      name: name.trim(),
      type,
      distanceNm: isSeaLeg ? distance : undefined,
      speedKnots: isSeaLeg && !durationHours ? speed : undefined,
      durationHours: durationHours || undefined,
    }

    if (fuelMode === 'blend') {
      return {
        ...base,
        fuelStreams: [],
        blendMode: {
          enabled: true,
          blendId,
          totalRatePerDay: blendTotal,
          portTotalRatePerDay: blendPortTotal || undefined,
        },
      }
    }

    if (fuelMode === 'eca' && isSeaLeg) {
      return {
        ...base,
        fuelStreams: streams,
        ecaZone: {
          enabled: true,
          ecaDistanceNm: ecaDist,
          ecaFuelGradeId: ecaGrade,
          ecaRatePerDay: ecaRate,
          ecaTankIds,
          nonEcaOverride: ecaOverrideEnabled
            ? { fuelGradeId: ecaOverrideGrade, ratePerDay: ecaOverrideRate, tankIds: ecaOverrideTankIds }
            : undefined,
        },
      }
    }

    return { ...base, fuelStreams: streams }
  }

  const valid = name.trim().length > 0 && (
    fuelMode !== 'blend' || (blendId && blendTotal > 0)
  )

  const handleSave = () => {
    if (!valid) return
    const leg = buildLeg()
    if (editLeg) {
      updateLeg(editLeg.id, leg)
    } else {
      addLeg(leg)
    }
    onClose()
  }

  const blends = voyage?.blendLibrary ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editLeg ? 'Edit Leg' : 'Add Voyage Leg'}
      subtitle="Define route segment and fuel consumption"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!valid}>
            {editLeg ? 'Save Changes' : 'Add Leg'}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Name + Type */}
        <FormRow>
          <FormField label="Leg Name" required className="col-span-2 sm:col-span-1">
            <TextInput value={name} onChange={setName} placeholder="e.g. Singapore → Rotterdam" />
          </FormField>
          <FormField label="Leg Type">
            <SelectInput
              value={type}
              onChange={v => setType(v as LegType)}
              options={LEG_TYPE_OPTIONS}
            />
          </FormField>
        </FormRow>

        {/* Distance / Speed / Duration */}
        {isSeaLeg ? (
          <FormRow>
            <FormField label="Distance" hint="nm">
              <NumericInput value={distance} onChange={setDistance} unit="nm" min={0} />
            </FormField>
            <FormField label="Speed" hint="knots (ignored if duration set)">
              <NumericInput value={speed} onChange={setSpeed} unit="kn" min={0.1} />
            </FormField>
            <FormField label="Duration override" hint="hours — set if speed/dist not available">
              <NumericInput value={durationHours} onChange={setDurationHours} unit="h" min={0} />
            </FormField>
            {estHours > 0 && (
              <div className="col-span-2 sm:col-span-1 flex items-end pb-1">
                <span className="text-xs text-blue-400 bg-blue-950/40 border border-blue-800/30 px-2 py-1 rounded">
                  ≈ {estHours.toFixed(1)} h sea time
                </span>
              </div>
            )}
          </FormRow>
        ) : (
          <FormField label="Duration" required hint="hours at port / anchorage / canal">
            <NumericInput value={durationHours} onChange={setDurationHours} unit="h" min={0} />
          </FormField>
        )}

        {/* Fuel mode selector */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Fuel Consumption Mode</p>
          <div className="flex gap-2">
            {([
              { id: 'standard', label: 'Standard' },
              { id: 'eca', label: 'ECA Zone', disabled: !isSeaLeg },
              { id: 'blend', label: 'Blend', disabled: blends.length === 0 },
            ] as const).map(m => (
              <button
                key={m.id}
                disabled={(m as any).disabled}
                onClick={() => setFuelMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  fuelMode === m.id
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {m.id === 'eca' && fuelMode === 'eca' ? '⚓ ECA Zone' : m.label}
              </button>
            ))}
          </div>
          {fuelMode === 'blend' && blends.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Define blends in the Blend Library first.</p>
          )}
        </div>

        {/* ── Standard mode ─────────────────────────────────────────────────── */}
        {fuelMode === 'standard' && (
          <div className="flex flex-col gap-3">
            {streams.map((s, i) => (
              <FuelStreamRow
                key={i}
                stream={s}
                index={i}
                onChange={updated => setStreams(prev => prev.map((x, j) => j === i ? updated : x))}
                onDelete={() => setStreams(prev => prev.filter((_, j) => j !== i))}
              />
            ))}
            <button
              onClick={() => setStreams(p => [...p, { fuelGradeId: defaultGradeId, ratePerDay: 5, tankIds: [] }])}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add fuel stream
            </button>
          </div>
        )}

        {/* ── ECA mode ──────────────────────────────────────────────────────── */}
        {fuelMode === 'eca' && isSeaLeg && (
          <div className="flex flex-col gap-3">
            {/* Main fuel outside ECA */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Outside ECA (main fuel)</p>
              {streams.map((s, i) => (
                <FuelStreamRow
                  key={i}
                  stream={s}
                  index={i}
                  onChange={updated => setStreams(prev => prev.map((x, j) => j === i ? updated : x))}
                  onDelete={() => setStreams(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
              <button
                onClick={() => setStreams(p => [...p, { fuelGradeId: defaultGradeId, ratePerDay: 50, tankIds: [] }])}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add stream
              </button>
            </div>

            {/* ECA zone */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/30">
              <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">ECA Zone</p>
              <FormRow>
                <FormField label="ECA Distance" hint="nm inside ECA">
                  <NumericInput value={ecaDist} onChange={setEcaDist} unit="nm" min={0} max={distance || undefined} />
                </FormField>
                <FormField label="ECA Fuel Grade">
                  <SelectInput value={ecaGrade} onChange={setEcaGrade} options={gradeOpts} />
                </FormField>
              </FormRow>
              <FormField label="ECA Consumption Rate" hint="MT/day inside ECA" className="mt-2">
                <NumericInput value={ecaRate} onChange={setEcaRate} unit="MT/d" min={0} />
              </FormField>
              <div className="mt-2">
                <TankSelector
                  fuelGradeId={ecaGrade}
                  selected={ecaTankIds}
                  onChange={setEcaTankIds}
                  label="ECA tanks to draw from:"
                />
              </div>
              {distance > 0 && ecaDist > 0 && (
                <div className="mt-2 text-xs text-emerald-400/80 bg-emerald-950/30 rounded px-2 py-1">
                  {ecaDist} nm ECA ({Math.round(ecaDist/distance*100)}%) + {distance - ecaDist} nm non-ECA ({Math.round((1-ecaDist/distance)*100)}%)
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Blend mode ────────────────────────────────────────────────────── */}
        {fuelMode === 'blend' && blends.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-violet-950/30 border border-violet-800/30">
              <p className="text-xs font-semibold text-violet-400 mb-3 uppercase tracking-wide">Simultaneous Blend</p>
              <FormField label="Select Blend">
                <SelectInput
                  value={blendId}
                  onChange={setBlendId}
                  options={blends.map(b => ({ value: b.id, label: b.label }))}
                />
              </FormField>
              {blendId && (() => {
                const blend = blends.find(b => b.id === blendId)
                return blend ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {blend.streams.map(s => {
                      const g = fuelGrades.find(f => f.id === s.fuelGradeId)
                      return (
                        <span key={s.fuelGradeId} className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300">
                          {g?.label ?? s.fuelGradeId}: <strong>{Math.round(s.ratio * 100)}%</strong>
                        </span>
                      )
                    })}
                  </div>
                ) : null
              })()}
              <FormRow className="mt-3">
                <FormField label="Total Rate (sea)" hint="MT/day — split by ratios">
                  <NumericInput value={blendTotal} onChange={setBlendTotal} unit="MT/d" min={0} />
                </FormField>
                <FormField label="Total Rate (port)" hint="MT/day in port (0 = same as sea)">
                  <NumericInput value={blendPortTotal} onChange={setBlendPortTotal} unit="MT/d" min={0} />
                </FormField>
              </FormRow>
              {blendId && blendTotal > 0 && (() => {
                const blend = blends.find(b => b.id === blendId)
                return blend ? (
                  <div className="mt-2 text-xs text-violet-300/80 bg-violet-950/20 rounded px-2 py-1.5">
                    {blend.streams.map(s => {
                      const g = fuelGrades.find(f => f.id === s.fuelGradeId)
                      return (
                        <span key={s.fuelGradeId} className="mr-3">
                          {g?.label}: {(blendTotal * s.ratio).toFixed(1)} MT/d
                        </span>
                      )
                    })}
                  </div>
                ) : null
              })()}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
