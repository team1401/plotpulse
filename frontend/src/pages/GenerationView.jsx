import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Zap,
  Clock
} from 'lucide-react'
import { api } from '../utils/api'
import { socket } from '../utils/socket'
import { useAppStore } from '../stores/useAppStore'
import { formatNumber, formatCost, formatDuration } from '../utils/format'
import Card from '../components/Card'
import Button from '../components/Button'
import ProgressBar from '../components/ProgressBar'

export default function GenerationView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updateNovel, updateProgress } = useAppStore()
  const [novel, setNovel] = useState(null)
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentChapter: null,
    wordCount: 0,
    cost: 0,
    startTime: null,
    status: 'idle'
  })
  const [currentText, setCurrentText] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  
  useEffect(() => {
    loadNovel()
    socket.connect()
    socket.joinNovel(id)
    
    // Listen for progress updates
    socket.on('generation:progress', handleProgress)
    socket.on('generation:chapter-start', handleChapterStart)
    socket.on('generation:chapter-complete', handleChapterComplete)
    socket.on('generation:complete', handleComplete)
    socket.on('generation:error', handleError)
    
    // Poll for progress every 10 seconds as fallback (WebSocket may not deliver all events)
    const pollInterval = setInterval(pollProgress, 10000)
    
    return () => {
      socket.off('generation:progress')
      socket.off('generation:chapter-start')
      socket.off('generation:chapter-complete')
      socket.off('generation:complete')
      socket.off('generation:error')
      socket.leaveNovel(id)
      clearInterval(pollInterval)
    }
  }, [id])
  
  const loadNovel = async () => {
    try {
      const data = await api.getNovel(id)
      setNovel(data)
      setIsPaused(data.status === 'paused')
      // Also poll for real progress
      await pollProgress()
    } catch (error) {
      console.error('Failed to load novel:', error)
    }
  }
  
  const pollProgress = async () => {
    try {
      const status = await api.getGenerationStatus(id)
      if (!status) return
      
      const chaptersCompleted = status.chapters?.completed || 0
      const chaptersTotal = status.chapters?.total || 0
      const novelData = status.novel || {}
      
      setProgress(prev => ({
        ...prev,
        current: chaptersCompleted,
        total: chaptersTotal,
        wordCount: novelData.currentWordCount || novelData.current_word_count || prev.wordCount,
        cost: novelData.totalCost || novelData.total_cost || prev.cost,
        status: chaptersCompleted >= chaptersTotal && chaptersTotal > 0 ? 'complete' : 
                (novelData.status === 'paused' ? 'paused' : 'generating'),
        startTime: prev.startTime || Date.now()
      }))
      
      if (novelData.title) {
        setNovel(prev => prev ? { ...prev, title: novelData.title, status: novelData.status } : prev)
      }
      
      // Auto-navigate to reader when complete
      if (chaptersCompleted >= chaptersTotal && chaptersTotal > 0 && novelData.status === 'complete') {
        setTimeout(() => navigate(`/novel/${id}`), 2000)
      }
    } catch (error) {
      // Silently ignore poll errors
    }
  }
  
  const handleProgress = (data) => {
    setProgress(prev => ({ ...prev, ...data }))
    updateProgress(data)
    if (data.text) {
      setCurrentText(data.text)
    }
  }
  
  const handleChapterStart = (data) => {
    setProgress(prev => ({
      ...prev,
      currentChapter: data.chapter,
      current: data.chapterNumber
    }))
    setCurrentText('')
  }
  
  const handleChapterComplete = (data) => {
    setProgress(prev => ({
      ...prev,
      wordCount: prev.wordCount + data.wordCount,
      cost: prev.cost + data.cost
    }))
  }
  
  const handleComplete = () => {
    setProgress(prev => ({ ...prev, status: 'complete' }))
    updateNovel(id, { status: 'complete' })
    setTimeout(() => {
      navigate(`/novel/${id}`)
    }, 2000)
  }
  
  const handleError = (data) => {
    alert('Generation error: ' + data.message)
  }
  
  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await api.resumeGeneration(id)
        setIsPaused(false)
      } else {
        await api.pauseGeneration(id)
        setIsPaused(true)
      }
    } catch (error) {
      console.error('Failed to pause/resume:', error)
    }
  }
  
  const percentage = progress.total > 0 
    ? (progress.current / progress.total) * 100 
    : 0
  
  const estimatedTimeRemaining = progress.startTime && progress.current > 0
    ? ((Date.now() - progress.startTime) / progress.current) * (progress.total - progress.current)
    : null
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          {progress.status === 'complete' ? 'Generation Complete!' : 'Generating Your Novel'}
        </h1>
        <p className="text-slate-400 text-lg">
          {novel?.title || 'Untitled Novel'}
        </p>
      </motion.div>
      
      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card gradient className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Chapters</div>
              <div className="text-2xl font-bold text-white">
                {progress.current}/{progress.total}
              </div>
            </div>
          </div>
        </Card>
        
        <Card gradient className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Word Count</div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(progress.wordCount)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card gradient className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Cost</div>
              <div className="text-2xl font-bold text-white">
                {formatCost(progress.cost)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card gradient className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Time Left</div>
              <div className="text-2xl font-bold text-white">
                {estimatedTimeRemaining 
                  ? formatDuration(estimatedTimeRemaining)
                  : '—'}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Progress Bar */}
      <Card gradient className="p-8 mb-8">
        <ProgressBar
          value={progress.current}
          max={progress.total}
          label={progress.currentChapter?.title || 'Preparing...'}
          size="lg"
          animated
        />
        
        <div className="flex gap-4 mt-6">
          <Button
            variant="secondary"
            icon={isPaused ? Play : Pause}
            onClick={handlePauseResume}
            disabled={progress.status === 'complete'}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          
          {progress.status === 'complete' && (
            <Button
              icon={CheckCircle}
              onClick={() => navigate(`/novel/${id}`)}
              className="flex-1"
            >
              View Novel
            </Button>
          )}
        </div>
      </Card>
      
      {/* Live Preview */}
      <AnimatePresence mode="wait">
        {currentText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {progress.currentChapter?.title}
                </h2>
                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium animate-pulse">
                  ● Live
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-300 font-serif text-lg leading-relaxed whitespace-pre-wrap"
                >
                  {currentText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1 h-5 bg-primary-400 ml-1"
                  />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Generation Complete Animation */}
      <AnimatePresence>
        {progress.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
