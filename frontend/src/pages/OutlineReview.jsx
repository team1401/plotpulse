import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Edit2, Users, Globe, Lightbulb, BookOpen } from 'lucide-react'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'

export default function OutlineReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [novel, setNovel] = useState(null)
  const [outline, setOutline] = useState(null)
  const [bible, setBible] = useState(null)
  const [editMode, setEditMode] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [id])
  
  useEffect(() => {
    // Poll for outline if novel is in 'outlining' status
    if (novel && novel.status === 'outlining' && !outline) {
      const interval = setInterval(async () => { // Poll every 5s
        try {
          const novelData = await api.getNovel(id)
          setNovel(novelData)
          if (novelData.outline && novelData.outline.chapter_summaries) {
            setOutline(novelData.outline)
            const bibleData = await api.getStoryBible(id)
            setBible(bibleData)
            clearInterval(interval)
          }
          if (novelData.status === 'error' || novelData.status === 'failed') {
            clearInterval(interval)
          }
        } catch (e) {
          console.error('Polling error:', e)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [novel?.status, outline, id])
  
  const loadData = async () => {
    try {
      const [novelData, bibleData] = await Promise.all([
        api.getNovel(id),
        api.getStoryBible(id).catch(() => null)
      ])
      setNovel(novelData)
      setOutline(novelData.outline)
      setBible(bibleData)
    } catch (error) {
      console.error('Failed to load outline:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await api.approveOutline(id)
      // Start chapter generation after approving outline
      await api.startGeneration(id)
      navigate(`/novel/${id}/generate`)
    } catch (error) {
      console.error('Failed to approve outline:', error)
      alert('Failed to start generation: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }
  
  const updateChapter = (index, field, value) => {
    const updated = { ...outline }
    updated.chapters[index][field] = value
    setOutline(updated)
  }
  
  const updateBible = (section, field, value) => {
    const updated = { ...bible }
    if (!updated[section]) updated[section] = {}
    updated[section][field] = value
    setBible(updated)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading outline...</p>
        </div>
      </div>
    )
  }
  
  if (!outline && novel?.status === 'outlining') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Generating Your Outline</h2>
          <p className="text-slate-400 mb-4">
            The AI is crafting a detailed outline based on your premise. This usually takes 30-60 seconds...
          </p>
          <p className="text-xs text-slate-500">
            If this takes too long, check that your API key is saved in Settings.
          </p>
        </div>
      </div>
    )
  }
  
  if (!outline) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Outline Generation Failed</h2>
          <p className="text-slate-400 mb-6">
            The AI couldn't generate an outline. Make sure your API key is saved in Settings, then try creating a new novel.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => navigate('/settings')}>
              Check Settings
            </Button>
            <Button onClick={() => navigate('/new')}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Review Your Outline
        </h1>
        <p className="text-slate-400 text-lg">
          {novel?.title || 'Untitled Novel'}
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Chapters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-400" />
              Chapters
            </h2>
            <Button
              variant="secondary"
              size="sm"
              icon={Edit2}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Done Editing' : 'Edit'}
            </Button>
          </div>
          
          {(outline?.chapters || outline?.chapterSummaries)?.map((chapter, index) => (
            <Card key={index} gradient className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 font-bold text-white">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {editMode ? (
                    <div className="space-y-3">
                      <Input
                        value={chapter.title}
                        onChange={(e) => updateChapter(index, 'title', e.target.value)}
                        placeholder="Chapter title"
                      />
                      <Textarea
                        value={chapter.summary}
                        onChange={(e) => updateChapter(index, 'summary', e.target.value)}
                        placeholder="Chapter summary"
                        minRows={3}
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {chapter.title}
                      </h3>
                      <p className="text-slate-300 leading-relaxed font-serif">
                        {chapter.summary}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Sidebar - Story Bible */}
        <div className="space-y-6">
          {/* Characters */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Characters
            </h3>
            {(() => {
              const chars = bible?.characters
              if (!chars || (typeof chars === 'object' && Object.keys(chars).length === 0)) {
                return <p className="text-slate-500 text-sm">No character details yet</p>
              }
              if (typeof chars === 'object' && !Array.isArray(chars)) {
                return Object.entries(chars).map(([name, char]) => (
                  <div key={name} className="mb-4 last:mb-0">
                    <div className="font-semibold text-white text-sm">{typeof char === 'object' ? char.name || name : name}</div>
                    {typeof char === 'object' && char.role && <div className="text-xs text-primary-400 mb-1">{char.role}</div>}
                    {typeof char === 'object' && char.description && <p className="text-slate-400 text-xs leading-relaxed">{char.description}</p>}
                    {typeof char === 'object' && char.arc && <p className="text-slate-500 text-xs mt-1 italic">{char.arc}</p>}
                  </div>
                ))
              }
              if (Array.isArray(chars)) {
                return chars.map((char, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="font-semibold text-white text-sm">{char.name || `Character ${i+1}`}</div>
                    {char.role && <div className="text-xs text-primary-400 mb-1">{char.role}</div>}
                    {char.description && <p className="text-slate-400 text-xs leading-relaxed">{char.description}</p>}
                  </div>
                ))
              }
              return <p className="text-slate-300 text-sm whitespace-pre-wrap">{String(chars)}</p>
            })()}
          </Card>
          
          {/* World */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-400" />
              World & Setting
            </h3>
            {(() => {
              const world = bible?.worldRules || bible?.world_rules
              if (!world || (typeof world === 'object' && Object.keys(world).length === 0)) {
                return <p className="text-slate-500 text-sm">No world details yet</p>
              }
              if (typeof world === 'object') {
                return Object.entries(world).map(([key, value]) => (
                  <div key={key} className="mb-3 last:mb-0">
                    <div className="font-semibold text-white text-xs uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                    <p className="text-slate-400 text-xs leading-relaxed">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                  </div>
                ))
              }
              return <p className="text-slate-300 text-sm whitespace-pre-wrap">{String(world)}</p>
            })()}
          </Card>
          
          {/* Themes */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary-400" />
              Themes
            </h3>
            {(() => {
              const themes = bible?.themes
              if (!themes || (Array.isArray(themes) && themes.length === 0)) {
                return <p className="text-slate-500 text-sm">No themes yet</p>
              }
              if (Array.isArray(themes)) {
                return (
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs">
                        {typeof theme === 'string' ? theme : theme.name || JSON.stringify(theme)}
                      </span>
                    ))}
                  </div>
                )
              }
              return <p className="text-slate-300 text-sm">{String(themes)}</p>
            })()}
          </Card>
        </div>
      </div>
      
      {/* Approve Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex gap-4"
      >
        <Button
          variant="secondary"
          onClick={() => navigate('/')}
          className="flex-1"
        >
          Save for Later
        </Button>
        <Button
          icon={CheckCircle}
          loading={submitting}
          onClick={handleApprove}
          className="flex-1"
        >
          Approve & Start Generation
        </Button>
      </motion.div>
    </div>
  )
}
