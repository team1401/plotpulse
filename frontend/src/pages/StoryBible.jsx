import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Globe, Clock, Lightbulb, Save, ArrowLeft } from 'lucide-react'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Textarea from '../components/Textarea'

const TABS = [
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'themes', label: 'Themes', icon: Lightbulb },
]

export default function StoryBible() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('characters')
  const [bible, setBible] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  
  useEffect(() => {
    loadBible()
  }, [id])
  
  const loadBible = async () => {
    try {
      const data = await api.getStoryBible(id)
      setBible(data)
      setLastSync(data.lastUpdated)
    } catch (error) {
      console.error('Failed to load story bible:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateStoryBible(id, bible)
      setLastSync(Date.now())
    } catch (error) {
      console.error('Failed to save story bible:', error)
      alert('Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }
  
  const updateSection = (section, value) => {
    setBible(prev => ({ ...prev, [section]: value }))
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading story bible...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/novel/${id}`)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Story Bible
            </h1>
            <p className="text-slate-400 text-lg">
              Your novel's consistency engine
            </p>
          </div>
          <Button
            icon={Save}
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
        
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Last synced: {new Date(lastSync).toLocaleTimeString()}
          </div>
        )}
      </motion.div>
      
      {/* Tabs */}
      <Card className="p-2 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-lg transition-all relative ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/20'
                    : 'hover:bg-white/5'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  activeTab === tab.id ? 'text-primary-400' : 'text-slate-400'
                }`} />
                <div className={`font-medium text-sm ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-400'
                }`}>
                  {tab.label}
                </div>
              </button>
            )
          })}
        </div>
      </Card>
      
      {/* Content */}
      <Card className="p-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'characters' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Characters</h2>
              <p className="text-slate-400 mb-6">
                Track character descriptions, personalities, relationships, and arcs. 
                This information is used to maintain consistency across all chapters.
              </p>
              <Textarea
                placeholder="Document your characters here...&#10;&#10;Example:&#10;&#10;**John Smith** - Protagonist&#10;• Age: 35&#10;• Appearance: Tall, graying hair, always wears a leather jacket&#10;• Personality: Cynical but caring, quick-witted&#10;• Speech patterns: Uses dry humor, often references old movies&#10;• Relationships: Estranged from his brother, dating Sarah&#10;• Arc: Learns to trust others again"
                value={bible.characters || ''}
                onChange={(e) => updateSection('characters', e.target.value)}
                minRows={15}
              />
            </div>
          )}
          
          {activeTab === 'world' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">World & Setting</h2>
              <p className="text-slate-400 mb-6">
                Define the rules of your world, key locations, technology, magic systems, 
                and any other world-building details.
              </p>
              <Textarea
                placeholder="Document your world here...&#10;&#10;Example:&#10;&#10;**Setting:** Neo-Tokyo, 2087&#10;• Climate: Perpetual rain due to weather control malfunction&#10;• Technology: Neural implants common, flying cars rare&#10;• Society: Strict class system, lower city vs. upper platforms&#10;• Key locations:&#10;  - The Neon District (entertainment)&#10;  - The Undercity (slums)&#10;  - Zenith Tower (corporate headquarters)"
                value={bible.world || ''}
                onChange={(e) => updateSection('world', e.target.value)}
                minRows={15}
              />
            </div>
          )}
          
          {activeTab === 'timeline' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Timeline</h2>
              <p className="text-slate-400 mb-6">
                Track key events, their order, and timing to maintain chronological consistency.
              </p>
              <Textarea
                placeholder="Document your timeline here...&#10;&#10;Example:&#10;&#10;**Day 1** - Monday, June 15&#10;• Morning: John discovers the body&#10;• Afternoon: Police interrogation&#10;• Evening: Meets with Sarah at the cafe&#10;&#10;**Day 2** - Tuesday, June 16&#10;• John investigates the warehouse&#10;• Sarah goes missing&#10;&#10;**Flashbacks**&#10;• 10 years ago: John's brother disappears&#10;• 5 years ago: John becomes a detective"
                value={bible.timeline || ''}
                onChange={(e) => updateSection('timeline', e.target.value)}
                minRows={15}
              />
            </div>
          )}
          
          {activeTab === 'themes' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Themes & Style</h2>
              <p className="text-slate-400 mb-6">
                Define the core themes, motifs, symbols, tone, and stylistic elements 
                that should persist throughout the novel.
              </p>
              <Textarea
                placeholder="Document themes and style here...&#10;&#10;Example:&#10;&#10;**Core Themes**&#10;• Redemption and second chances&#10;• The cost of isolation&#10;• Truth vs. comfortable lies&#10;&#10;**Motifs**&#10;• Rain (cleansing, melancholy)&#10;• Neon lights (false hope, artificiality)&#10;• Old photographs (nostalgia, loss)&#10;&#10;**Tone**&#10;• Noir-inspired, melancholic but hopeful&#10;• Introspective internal monologue&#10;• Sharp, witty dialogue&#10;&#10;**Style Notes**&#10;• Short, punchy sentences during action&#10;• Longer, flowing prose for reflection&#10;• Minimal exposition, show don't tell"
                value={bible.themes || ''}
                onChange={(e) => updateSection('themes', e.target.value)}
                minRows={15}
              />
            </div>
          )}
        </motion.div>
      </Card>
    </div>
  )
}
