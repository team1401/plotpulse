import { Menu, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { motion } from 'framer-motion'

export default function Header() {
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useAppStore()
  
  return (
    <header className="h-16 border-b border-white/5 backdrop-blur-xl bg-slate-900/30 flex items-center justify-between px-6 relative z-10">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 group-hover:from-primary-500/10 to-accent-500/0 group-hover:to-accent-500/10 transition-all" />
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 relative z-10" />
          ) : (
            <Sun className="w-5 h-5 relative z-10" />
          )}
        </button>
      </div>
    </header>
  )
}
