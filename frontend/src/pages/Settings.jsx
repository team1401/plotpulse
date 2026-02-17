import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Check, X, Server } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
// Toggle removed - dark mode only

export default function Settings() {
  const { settings, updateSettings } = useAppStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState({})
  const [validation, setValidation] = useState({})
  
  const handleValidate = async (provider, key) => {
    if (!key) return
    
    setValidating(prev => ({ ...prev, [provider]: true }))
    try {
      await api.validateApiKey(provider, key)
      setValidation(prev => ({ ...prev, [provider]: 'valid' }))
    } catch (error) {
      setValidation(prev => ({ ...prev, [provider]: 'invalid' }))
    } finally {
      setValidating(prev => ({ ...prev, [provider]: false }))
    }
  }
  
  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      updateSettings(localSettings)
      
      // Save API keys to backend (encrypted server-side for AI generation)
      if (localSettings.anthropicKey) {
        await api.saveApiKey('anthropic', localSettings.anthropicKey)
      }
      if (localSettings.openaiKey) {
        await api.saveApiKey('openai', localSettings.openaiKey)
      }
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }
  
  const updateLocalSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    // Clear validation when key changes
    if (key.includes('Key')) {
      const provider = key.replace('Key', '')
      setValidation(prev => ({ ...prev, [provider]: undefined }))
    }
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-400 text-lg">
          Configure your PlotPulse experience
        </p>
      </motion.div>
      
      <div className="space-y-6">
        {/* API Keys */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-primary-400" />
            <h2 className="text-2xl font-bold text-white">API Keys</h2>
          </div>
          
          <p className="text-slate-400 mb-6">
            Your API keys are stored securely and never leave your device. 
            They're only used to make requests to AI providers on your behalf.
          </p>
          
          <div className="space-y-6">
            {/* Anthropic */}
            <div>
              <div className="flex items-end gap-3">
                <Input
                  label="Anthropic API Key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={localSettings.anthropicKey}
                  onChange={(e) => updateLocalSetting('anthropicKey', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  loading={validating.anthropic}
                  onClick={() => handleValidate('anthropic', localSettings.anthropicKey)}
                  disabled={!localSettings.anthropicKey}
                >
                  Validate
                </Button>
              </div>
              {validation.anthropic === 'valid' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2 text-sm text-green-400"
                >
                  <Check className="w-4 h-4" />
                  Valid API key
                </motion.div>
              )}
              {validation.anthropic === 'invalid' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2 text-sm text-red-400"
                >
                  <X className="w-4 h-4" />
                  Invalid API key
                </motion.div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
            
            {/* OpenAI */}
            <div>
              <div className="flex items-end gap-3">
                <Input
                  label="OpenAI API Key"
                  type="password"
                  placeholder="sk-..."
                  value={localSettings.openaiKey}
                  onChange={(e) => updateLocalSetting('openaiKey', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  loading={validating.openai}
                  onClick={() => handleValidate('openai', localSettings.openaiKey)}
                  disabled={!localSettings.openaiKey}
                >
                  Validate
                </Button>
              </div>
              {validation.openai === 'valid' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2 text-sm text-green-400"
                >
                  <Check className="w-4 h-4" />
                  Valid API key
                </motion.div>
              )}
              {validation.openai === 'invalid' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2 text-sm text-red-400"
                >
                  <X className="w-4 h-4" />
                  Invalid API key
                </motion.div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
          </div>
        </Card>
        
        {/* Ollama */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-primary-400" />
            <h2 className="text-2xl font-bold text-white">Local Models (Ollama)</h2>
          </div>
          
          <p className="text-slate-400 mb-6">
            Use Ollama for free, local AI generation. No API keys required.
          </p>
          
          <Input
            label="Ollama Endpoint"
            placeholder="http://localhost:11434"
            value={localSettings.ollamaEndpoint}
            onChange={(e) => updateLocalSetting('ollamaEndpoint', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">
            Install Ollama from{' '}
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              ollama.ai
            </a>
          </p>
        </Card>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            loading={saving}
            onClick={handleSave}
            size="lg"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
