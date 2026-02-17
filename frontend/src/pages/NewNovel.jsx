import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Map, Plus, Trash2, Loader2 } from 'lucide-react'
import { api } from '../utils/api'
import { useAppStore } from '../stores/useAppStore'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Select from '../components/Select'
import Slider from '../components/Slider'
import Toggle from '../components/Toggle'

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (Fast, Affordable)' },
  { value: 'claude-opus-4', label: 'Claude Opus 4 (Best Quality)' },
  { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
  { value: 'gpt-o1', label: 'GPT-o1 (Reasoning)' },
]

export default function NewNovel() {
  const navigate = useNavigate()
  const { settings, addNovel } = useAppStore()
  const [mode, setMode] = useState('spark') // 'spark' or 'blueprint'
  const [loading, setLoading] = useState(false)
  
  // Common fields
  const [title, setTitle] = useState('')
  const [model, setModel] = useState('claude-sonnet-4')
  const [style, setStyle] = useState('')
  const [creativity, setCreativity] = useState(0.7)
  const [autonomous, setAutonomous] = useState(true)
  
  // Spark mode
  const [premise, setPremise] = useState('')
  
  // Blueprint mode
  const [chapters, setChapters] = useState([{ title: '', summary: '' }])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!settings.anthropicKey && !settings.openaiKey) {
      alert('Please configure your API keys in Settings first')
      navigate('/settings')
      return
    }
    
    setLoading(true)
    
    try {
      const data = {
        title: title || 'Untitled Novel',
        model,
        style,
        creativity,
        autonomous,
      }
      
      if (mode === 'spark') {
        data.mode = 'spark'
        data.premise = premise
      } else {
        data.mode = 'blueprint'
        data.outline = {
          chapters: chapters.filter(ch => ch.title && ch.summary)
        }
      }
      
      const novel = await api.createNovel(data)
      addNovel(novel)
      
      // For spark mode, trigger outline generation
      if (mode === 'spark') {
        await api.generateOutline(novel.id)
        navigate(`/novel/${novel.id}/outline`)
      } else {
        // For blueprint mode, go straight to generation
        navigate(`/novel/${novel.id}`)
      }
    } catch (error) {
      console.error('Failed to create novel:', error)
      alert('Failed to create novel: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const addChapter = () => {
    setChapters([...chapters, { title: '', summary: '' }])
  }
  
  const removeChapter = (index) => {
    setChapters(chapters.filter((_, i) => i !== index))
  }
  
  const updateChapter = (index, field, value) => {
    const updated = [...chapters]
    updated[index][field] = value
    setChapters(updated)
  }
  
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Create New Novel
        </h1>
        <p className="text-slate-400 text-lg">
          Choose your creative path
        </p>
      </motion.div>
      
      {/* Mode Selector */}
      <Card className="p-2 mb-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('spark')}
          className={`p-4 rounded-lg transition-all relative ${
            mode === 'spark'
              ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/20'
              : 'hover:bg-white/5'
          }`}
        >
          <Sparkles className={`w-8 h-8 mx-auto mb-2 ${mode === 'spark' ? 'text-primary-400' : 'text-slate-400'}`} />
          <div className={`font-semibold mb-1 ${mode === 'spark' ? 'text-white' : 'text-slate-300'}`}>
            Spark Mode
          </div>
          <div className="text-xs text-slate-500">
            Provide a premise, AI generates everything
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => setMode('blueprint')}
          className={`p-4 rounded-lg transition-all relative ${
            mode === 'blueprint'
              ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/20'
              : 'hover:bg-white/5'
          }`}
        >
          <Map className={`w-8 h-8 mx-auto mb-2 ${mode === 'blueprint' ? 'text-primary-400' : 'text-slate-400'}`} />
          <div className={`font-semibold mb-1 ${mode === 'blueprint' ? 'text-white' : 'text-slate-300'}`}>
            Blueprint Mode
          </div>
          <div className="text-xs text-slate-500">
            Provide chapter-by-chapter outline
          </div>
        </button>
      </Card>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-8 space-y-6">
          {/* Common Fields */}
          <Input
            label="Novel Title (optional)"
            placeholder="Leave blank for AI to generate"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <Select
            label="AI Model"
            options={MODEL_OPTIONS}
            value={model}
            onChange={setModel}
          />
          
          <Input
            label="Writing Style (optional)"
            placeholder="e.g., Literary fiction, fast-paced thriller, poetic, Hemingway-esque..."
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />
          
          <Slider
            label="Creativity Level"
            value={creativity}
            onChange={setCreativity}
            min={0}
            max={1}
            step={0.1}
            labels={{ 0: 'Conservative', 0.5: 'Balanced', 1: 'Experimental' }}
          />
          
          <Toggle
            label="Autonomous Mode"
            description="Generate entire novel without interruption. Turn off for chapter-by-chapter review."
            checked={autonomous}
            onChange={setAutonomous}
          />
          
          <div className="border-t border-white/10 pt-6">
            <AnimatePresence mode="wait">
              {mode === 'spark' ? (
                <motion.div
                  key="spark"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Textarea
                    label="Your Story Premise"
                    placeholder="Describe your story idea. Be as detailed or brief as you like. Examples:&#10;&#10;• A detective in 1920s New York investigates a series of murders connected to an ancient cult&#10;• A coming-of-age story about three friends building a startup in San Francisco&#10;• Fantasy epic where a young mage discovers she's the last of an ancient bloodline"
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    required
                    minRows={8}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="blueprint"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-slate-300">
                      Chapter Outline
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={Plus}
                      onClick={addChapter}
                    >
                      Add Chapter
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {chapters.map((chapter, index) => (
                      <Card key={index} className="p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-400">
                            Chapter {index + 1}
                          </span>
                          {chapters.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeChapter(index)}
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Input
                          placeholder="Chapter title"
                          value={chapter.title}
                          onChange={(e) => updateChapter(index, 'title', e.target.value)}
                          required
                        />
                        <Textarea
                          placeholder="Chapter summary (what happens in this chapter)"
                          value={chapter.summary}
                          onChange={(e) => updateChapter(index, 'summary', e.target.value)}
                          required
                          minRows={2}
                        />
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              {mode === 'spark' ? 'Generate Outline' : 'Create Novel'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
