import { create } from 'zustand'

export const useAppStore = create((set, get) => {
  // Initialize theme from localStorage
  const savedTheme = localStorage.getItem('plotpulse-theme') || 'dark'
  document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  
  // Initialize settings from localStorage
  const savedSettings = JSON.parse(localStorage.getItem('plotpulse-settings') || '{}')
  
  return {
    // Saved to localStorage
    // Theme
    theme: savedTheme,
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
      localStorage.setItem('plotpulse-theme', newTheme)
      return { theme: newTheme }
    }),
    
    // Settings
    settings: {
      anthropicKey: savedSettings.anthropicKey || '',
      openaiKey: savedSettings.openaiKey || '',
      ollamaEndpoint: savedSettings.ollamaEndpoint || 'http://localhost:11434',
    },
    updateSettings: (newSettings) => set((state) => {
      const updated = { ...state.settings, ...newSettings }
      localStorage.setItem('plotpulse-settings', JSON.stringify(updated))
      return { settings: updated }
    }),
      
      // Novels
      novels: [],
      currentNovelId: null,
      setNovels: (novels) => set({ novels }),
      setCurrentNovel: (id) => set({ currentNovelId: id }),
      addNovel: (novel) => set((state) => ({ novels: [...state.novels, novel] })),
      updateNovel: (id, updates) => set((state) => ({
        novels: state.novels.map(n => n.id === id ? { ...n, ...updates } : n)
      })),
      deleteNovel: (id) => set((state) => ({
        novels: state.novels.filter(n => n.id !== id),
        currentNovelId: state.currentNovelId === id ? null : state.currentNovelId
      })),
      
      // Current novel data
      currentOutline: null,
      currentStoryBible: null,
      currentChapters: [],
      setOutline: (outline) => set({ currentOutline: outline }),
      setStoryBible: (bible) => set({ currentStoryBible: bible }),
      setChapters: (chapters) => set({ currentChapters: chapters }),
      
      // Generation state
      isGenerating: false,
      generationProgress: {
        current: 0,
        total: 0,
        currentChapter: null,
        wordCount: 0,
        cost: 0
      },
      setGenerating: (isGenerating) => set({ isGenerating }),
      updateProgress: (progress) => set((state) => ({
        generationProgress: { ...state.generationProgress, ...progress }
      })),
    
    // UI state
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  }
})
