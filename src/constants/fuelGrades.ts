import type { FuelGrade } from '../types'

export const DEFAULT_FUEL_GRADES: FuelGrade[] = [
  {
    id: 'HFO',
    label: 'HFO 3.5%',
    sulfurPct: 3.5,
    isEcaCompliant: false,
    color: 'orange',
    density: 0.991,
    builtIn: true,
  },
  {
    id: 'VLSFO',
    label: 'VLSFO 0.5%',
    sulfurPct: 0.5,
    isEcaCompliant: false,
    color: 'blue',
    density: 0.991,
    builtIn: true,
  },
  {
    id: 'ULSFO',
    label: 'ULSFO 0.1%',
    sulfurPct: 0.1,
    isEcaCompliant: true,
    color: 'cyan',
    density: 0.991,
    builtIn: false,
  },
  {
    id: 'MGO',
    label: 'MGO 0.1%',
    sulfurPct: 0.1,
    isEcaCompliant: true,
    color: 'yellow',
    density: 0.845,
    builtIn: true,
  },
  {
    id: 'MDO',
    label: 'MDO 0.5%',
    sulfurPct: 0.5,
    isEcaCompliant: false,
    color: 'green',
    density: 0.860,
    builtIn: false,
  },
  {
    id: 'LSMGO',
    label: 'LSMGO 0.1%',
    sulfurPct: 0.1,
    isEcaCompliant: true,
    color: 'emerald',
    density: 0.845,
    builtIn: false,
  },
]

export const FUEL_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  orange:  { bg: 'bg-orange-900/40',  text: 'text-orange-300',  border: 'border-orange-700/50' },
  blue:    { bg: 'bg-blue-900/40',    text: 'text-blue-300',    border: 'border-blue-700/50' },
  cyan:    { bg: 'bg-cyan-900/40',    text: 'text-cyan-300',    border: 'border-cyan-700/50' },
  yellow:  { bg: 'bg-yellow-900/40',  text: 'text-yellow-300',  border: 'border-yellow-700/50' },
  green:   { bg: 'bg-green-900/40',   text: 'text-green-300',   border: 'border-green-700/50' },
  emerald: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', border: 'border-emerald-700/50' },
  violet:  { bg: 'bg-violet-900/40',  text: 'text-violet-300',  border: 'border-violet-700/50' },
  rose:    { bg: 'bg-rose-900/40',    text: 'text-rose-300',    border: 'border-rose-700/50' },
  slate:   { bg: 'bg-slate-700/40',   text: 'text-slate-300',   border: 'border-slate-600/50' },
}

export const AVAILABLE_COLORS = Object.keys(FUEL_COLOR_MAP)
