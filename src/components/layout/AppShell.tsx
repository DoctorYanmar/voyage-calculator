import { Ship, Map, Calculator, FileText } from 'lucide-react'
import { useUiStore, type TabId } from '../../store/uiStore'
import { TopNav } from './TopNav'
import { useVesselStore } from '../../store/vesselStore'
import { useVoyageStore } from '../../store/voyageStore'
import { useEffect } from 'react'

// Lazy panel imports
import { VesselPanel } from '../vessel/VesselPanel'
import { VoyagePanel } from '../voyage/VoyagePanel'
import { CalculatorPanel } from '../calculator/CalculatorPanel'
import { ReportPanel } from '../report/ReportPanel'

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'vessel',     label: 'Vessel Setup',    icon: Ship,       description: 'Tanks & fuel grades' },
  { id: 'voyage',     label: 'Voyage Plan',     icon: Map,        description: 'Legs, bunkers, ECA zones' },
  { id: 'calculator', label: 'Calculations',    icon: Calculator, description: 'Live ROB & fuel tracking' },
  { id: 'report',     label: 'Report',          icon: FileText,   description: 'Export & summary' },
]

export function AppShell() {
  const activeTab = useUiStore(s => s.activeTab)
  const setTab = useUiStore(s => s.setActiveTab)
  const activeVesselId = useVesselStore(s => s.activeVesselId)
  const initVoyage = useVoyageStore(s => s.initVoyage)

  // Auto-init voyage when vessel is active
  useEffect(() => {
    if (activeVesselId) initVoyage(activeVesselId)
  }, [activeVesselId, initVoyage])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <TopNav />

      {/* Tab bar */}
      <nav className="bg-slate-900 border-b border-slate-700/80 px-4 flex gap-1 shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${active
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'vessel'     && <VesselPanel />}
        {activeTab === 'voyage'     && <VoyagePanel />}
        {activeTab === 'calculator' && <CalculatorPanel />}
        {activeTab === 'report'     && <ReportPanel />}
      </main>
    </div>
  )
}
