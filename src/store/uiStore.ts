import { create } from 'zustand'

export type TabId = 'vessel' | 'voyage' | 'calculator' | 'report'

interface UiState {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Generic modal tracker
  openModals: Set<string>
  openModal: (id: string) => void
  closeModal: (id: string) => void
  isModalOpen: (id: string) => boolean
}

export const useUiStore = create<UiState>((set, get) => ({
  activeTab: 'calculator',
  setActiveTab: (tab) => set({ activeTab: tab }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openModals: new Set(),
  openModal: (id) => set(s => ({ openModals: new Set([...s.openModals, id]) })),
  closeModal: (id) =>
    set(s => {
      const next = new Set(s.openModals)
      next.delete(id)
      return { openModals: next }
    }),
  isModalOpen: (id) => get().openModals.has(id),
}))
