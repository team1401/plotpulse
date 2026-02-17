import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  PlusCircle, 
  BookOpen, 
  FileText,
  TrendingUp,
  Clock,
  DollarSign,
  Trash2
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { api } from '../utils/api'
import { formatNumber, formatCost, formatDate, getStatusColor, getStatusIcon } from '../utils/format'
import Card from '../components/Card'
import Button from '../components/Button'
import * as Icons from 'lucide-react'

export default function Dashboard() {
  const { novels, setNovels, deleteNovel: removeNovelFromStore } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    drafting: 0,
    complete: 0,
    totalWords: 0,
    totalCost: 0
  })
  
  useEffect(() => {
    loadNovels()
    // Auto-refresh every 15s while any novel is generating
    const interval = setInterval(loadNovels, 15000)
    return () => clearInterval(interval)
  }, [])
  
  const loadNovels = async () => {
    try {
      const data = await api.getNovels()
      const novelsList = data.novels || data || []
      setNovels(novelsList)
      
      // Calculate stats (handle both camelCase and snake_case field names)
      const stats = novelsList.reduce((acc, novel) => ({
        total: acc.total + 1,
        drafting: acc.drafting + (['drafting', 'generating', 'outlining', 'ready'].includes(novel.status) ? 1 : 0),
        complete: acc.complete + (novel.status === 'complete' ? 1 : 0),
        totalWords: acc.totalWords + (novel.currentWordCount || novel.current_word_count || novel.wordCount || 0),
        totalCost: acc.totalCost + (novel.totalCost || novel.total_cost || 0)
      }), { total: 0, drafting: 0, complete: 0, totalWords: 0, totalCost: 0 })
      
      setStats(stats)
    } catch (error) {
      console.error('Failed to load novels:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your novels...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Your Novels
        </h1>
        <p className="text-slate-400 text-lg">
          Where stories come to life
        </p>
      </motion.div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={BookOpen}
          label="Total Novels"
          value={stats.total}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={stats.drafting}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          icon={FileText}
          label="Total Words"
          value={formatNumber(stats.totalWords)}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(stats.totalCost)}
          gradient="from-orange-500 to-red-500"
        />
      </div>
      
      {/* Novels Grid */}
      {novels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {novels.map((novel, index) => (
            <NovelCard key={novel.id} novel={novel} index={index} onDelete={async (id) => {
              if (!window.confirm(`Delete "${novel.title}"? This cannot be undone.`)) return
              try {
                await api.deleteNovel(id)
                removeNovelFromStore(id)
              } catch (err) {
                alert('Failed to delete: ' + err.message)
              }
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, gradient }) {
  return (
    <Card gradient hover className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </Card>
  )
}

function NovelCard({ novel, index, onDelete }) {
  const StatusIcon = Icons[getStatusIcon(novel.status)]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={novel.status === 'outlining' || novel.status === 'ready' ? `/novel/${novel.id}/outline` : novel.status === 'generating' ? `/novel/${novel.id}/generate` : `/novel/${novel.id}`}>
        <Card hover className="p-6 h-full relative group">
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(novel.id) }}
              className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 text-slate-500 hover:text-red-400 z-10"
              title="Delete novel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-start justify-between mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(novel.status)}`}>
              {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
              {novel.status}
            </div>
            <div className="text-xs text-slate-500 mr-6">
              {novel.updatedAt ? formatDate(novel.updatedAt) : novel.updated_at ? formatDate(novel.updated_at) : ''}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
            {novel.title}
          </h3>
          
          {novel.premise && (
            <p className="text-sm text-slate-400 mb-4 line-clamp-3">
              {novel.premise}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="text-xs text-slate-500 mb-1">Words</div>
              <div className="text-lg font-semibold text-white">
                {formatNumber(novel.currentWordCount || novel.current_word_count || novel.wordCount || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Cost</div>
              <div className="text-lg font-semibold text-white">
                {formatCost(novel.totalCost || novel.total_cost || 0)}
              </div>
            </div>
          </div>
          
          {novel.status === 'drafting' && novel.progress && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Progress</span>
                <span>{novel.progress.current}/{novel.progress.total} chapters</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                  style={{ width: `${(novel.progress.current / novel.progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      </Link>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6">
        <BookOpen className="w-12 h-12 text-primary-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        No novels yet
      </h2>
      <p className="text-slate-400 mb-6 max-w-md mx-auto">
        Start your creative journey by generating your first AI-powered novel
      </p>
      <Link to="/new">
        <Button size="lg" icon={PlusCircle}>
          Create Your First Novel
        </Button>
      </Link>
    </Card>
  )
}
