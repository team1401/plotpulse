import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  PlusCircle, 
  BookOpen, 
  Settings, 
  DollarSign,
  ChevronLeft,
  Sparkles
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import clsx from 'clsx'

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/new', icon: PlusCircle, label: 'New Novel' },
  { path: '/costs', icon: DollarSign, label: 'Costs' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar, novels } = useAppStore()
  
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-64 border-r border-white/5 backdrop-blur-xl bg-slate-900/50 flex flex-col relative z-10"
        >
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  PlotPulse
                </h1>
                <p className="text-xs text-slate-400">AI Novel Generation</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-lg border border-white/10"
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                  <span className="font-medium relative z-10">{item.label}</span>
                </Link>
              )
            })}
            
            {/* Recent Novels */}
            {novels.length > 0 && (
              <div className="pt-6">
                <h3 className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Novels
                </h3>
                <div className="space-y-1">
                  {novels.slice(0, 5).map((novel) => (
                    <Link
                      key={novel.id}
                      to={novel.status === 'outlining' || novel.status === 'ready' ? `/novel/${novel.id}/outline` : novel.status === 'generating' ? `/novel/${novel.id}/generate` : `/novel/${novel.id}`}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm truncate">{novel.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>
          
          {/* Collapse button */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
