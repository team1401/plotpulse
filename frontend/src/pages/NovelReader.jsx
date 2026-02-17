import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  Flag, 
  RotateCw, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Eye
} from 'lucide-react'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Textarea from '../components/Textarea'
import Toggle from '../components/Toggle'
import Input from '../components/Input'

export default function NovelReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [novel, setNovel] = useState(null)
  const [chapters, setChapters] = useState([])
  const [currentChapter, setCurrentChapter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Modals
  const [flagModal, setFlagModal] = useState(false)
  const [flagNotes, setFlagNotes] = useState('')
  const [exportModal, setExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    includeCover: true,
    coverUrl: '',
    includeFrontMatter: true,
    title: '',
    author: '',
    dedication: ''
  })
  
  useEffect(() => {
    loadNovel()
  }, [id])
  
  const loadNovel = async () => {
    try {
      const [novelData, chaptersData] = await Promise.all([
        api.getNovel(id),
        api.getChapters(id)
      ])
      // Redirect based on novel status
      if (novelData.status === 'outlining' || novelData.status === 'ready') {
        navigate(`/novel/${id}/outline`, { replace: true })
        return
      }
      if (novelData.status === 'generating') {
        navigate(`/novel/${id}/generate`, { replace: true })
        return
      }
      
      setNovel(novelData)
      setChapters(chaptersData)
      setExportOptions(prev => ({
        ...prev,
        title: novelData.title,
        author: 'AI Generated'
      }))
    } catch (error) {
      console.error('Failed to load novel:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleFlag = async () => {
    try {
      const chapter = chapters[currentChapter]
      await api.updateChapter(chapter.id, {
        flagged: true,
        flagNotes: flagNotes
      })
      setFlagModal(false)
      setFlagNotes('')
      loadNovel()
    } catch (error) {
      console.error('Failed to flag chapter:', error)
    }
  }
  
  const handleRegenerate = async () => {
    try {
      const chapter = chapters[currentChapter]
      await api.regenerateChapter(chapter.id, flagNotes)
      setFlagModal(false)
      setFlagNotes('')
      loadNovel()
    } catch (error) {
      console.error('Failed to regenerate chapter:', error)
    }
  }
  
  const handleExport = async () => {
    try {
      const blob = await api.exportEpub(id, exportOptions)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${novel.title || 'novel'}.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setExportModal(false)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Export failed: ' + error.message)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading novel...</p>
        </div>
      </div>
    )
  }
  
  const chapter = chapters[currentChapter]
  
  return (
    <div className="flex h-full">
      {/* Chapter Navigation Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 border-r border-white/5 backdrop-blur-xl bg-slate-900/50 overflow-y-auto"
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white mb-2">
                {novel?.title}
              </h2>
              <p className="text-sm text-slate-400">
                {chapters.length} chapters
              </p>
            </div>
            
            <div className="p-4 space-y-2">
              {chapters.map((ch, index) => (
                <button
                  key={ch.id}
                  onClick={() => setCurrentChapter(index)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    index === currentChapter
                      ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-300">
                      {ch.title}
                    </span>
                    {ch.flagged && (
                      <Flag className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ch.wordCount?.toLocaleString()} words
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 border-b border-white/5 backdrop-blur-xl bg-slate-900/30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            
            <div className="text-sm text-slate-400">
              Chapter {currentChapter + 1} of {chapters.length}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => navigate(`/novel/${id}/bible`)}
            >
              Story Bible
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Flag}
              onClick={() => setFlagModal(true)}
            >
              Flag Chapter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCw}
              onClick={handleRegenerate}
            >
              Regenerate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => setExportModal(true)}
            >
              Export EPUB
            </Button>
          </div>
        </div>
        
        {/* Reader */}
        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={currentChapter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl font-bold text-white mb-8 font-serif">
              {chapter?.title}
            </h1>
            
            <div className="prose prose-lg prose-invert max-w-none">
              <div className="text-slate-300 font-serif text-xl leading-relaxed whitespace-pre-wrap">
                {chapter?.content}
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/10">
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
                disabled={currentChapter === 0}
              >
                Previous
              </Button>
              
              <div className="text-sm text-slate-500">
                {currentChapter + 1} / {chapters.length}
              </div>
              
              <Button
                variant="secondary"
                iconRight={ChevronRight}
                onClick={() => setCurrentChapter(Math.min(chapters.length - 1, currentChapter + 1))}
                disabled={currentChapter === chapters.length - 1}
              >
                Next
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Flag Modal */}
      <Modal
        isOpen={flagModal}
        onClose={() => setFlagModal(false)}
        title="Flag Chapter for Review"
      >
        <Textarea
          label="What needs to be changed?"
          placeholder="Describe what you'd like to see differently in this chapter..."
          value={flagNotes}
          onChange={(e) => setFlagNotes(e.target.value)}
          minRows={4}
        />
        
        <div className="flex gap-4 mt-6">
          <Button variant="secondary" onClick={() => setFlagModal(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleFlag} className="flex-1">
            Flag Chapter
          </Button>
        </div>
      </Modal>
      
      {/* Export Modal */}
      <Modal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        title="Export as EPUB"
        size="lg"
      >
        <div className="space-y-6">
          <Toggle
            label="Include Cover"
            description="Add a cover image to your EPUB"
            checked={exportOptions.includeCover}
            onChange={(val) => setExportOptions(prev => ({ ...prev, includeCover: val }))}
          />
          
          {exportOptions.includeCover && (
            <Input
              label="Cover Image URL"
              placeholder="https://example.com/cover.jpg"
              value={exportOptions.coverUrl}
              onChange={(e) => setExportOptions(prev => ({ ...prev, coverUrl: e.target.value }))}
            />
          )}
          
          <Toggle
            label="Include Front Matter"
            description="Add title page, copyright, dedication"
            checked={exportOptions.includeFrontMatter}
            onChange={(val) => setExportOptions(prev => ({ ...prev, includeFrontMatter: val }))}
          />
          
          {exportOptions.includeFrontMatter && (
            <>
              <Input
                label="Title"
                value={exportOptions.title}
                onChange={(e) => setExportOptions(prev => ({ ...prev, title: e.target.value }))}
              />
              <Input
                label="Author"
                value={exportOptions.author}
                onChange={(e) => setExportOptions(prev => ({ ...prev, author: e.target.value }))}
              />
              <Textarea
                label="Dedication (optional)"
                placeholder="For..."
                value={exportOptions.dedication}
                onChange={(e) => setExportOptions(prev => ({ ...prev, dedication: e.target.value }))}
                minRows={2}
              />
            </>
          )}
          
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <Button variant="secondary" onClick={() => setExportModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button icon={Download} onClick={handleExport} className="flex-1">
              Export EPUB
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
