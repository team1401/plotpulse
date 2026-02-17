const API_BASE = '/api'

// Logging utilities
export function logRequest(method, endpoint, status, duration) {
  const emoji = status < 300 ? '✅' : status < 500 ? '⚠️' : '❌'
  console.log(`${emoji} ${method} ${endpoint} → ${status} (${duration}ms)`)
}

export function logError(context, error, details = {}) {
  console.error(`[PlotPulse Error] ${context}:`, error)
  if (Object.keys(details).length > 0) {
    console.error('Details:', details)
  }
}

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const method = options.method || 'GET'
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }
    
    const start = Date.now()
    let response
    
    try {
      response = await fetch(url, config)
    } catch (err) {
      logError('API Network Error', err, { method, endpoint })
      throw new Error(`Network error: ${err.message}`)
    }
    
    const duration = Date.now() - start
    logRequest(method, endpoint, response.status, duration)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      const msg = error.message || error.error || `HTTP ${response.status}`
      logError('API Error', new Error(msg), { 
        method, endpoint, status: response.status, 
        responseBody: error, duration 
      })
      throw new Error(msg)
    }
    
    return response.json()
  }
  
  // Novels
  async getNovels() {
    return this.request('/novels')
  }
  
  async getNovel(id) {
    return this.request(`/novels/${id}`)
  }
  
  async createNovel(data) {
    return this.request('/novels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  async updateNovel(id, data) {
    return this.request(`/novels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
  
  async deleteNovel(id) {
    return this.request(`/novels/${id}`, {
      method: 'DELETE',
    })
  }
  
  async getNovelStats(id) {
    return this.request(`/novels/${id}/stats`)
  }
  
  // Outline generation
  async generateOutline(novelId) {
    return this.request(`/generation/outline/${novelId}`, {
      method: 'POST',
    })
  }
  
  async approveOutline(novelId) {
    return this.request(`/generation/outline/${novelId}/approve`, {
      method: 'POST',
    })
  }
  
  // Chapter generation
  async startGeneration(novelId, options = {}) {
    return this.request(`/generation/novel/${novelId}/generate-all`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }
  
  async pauseGeneration(novelId) {
    return this.request(`/generation/novel/${novelId}/pause`, {
      method: 'POST',
    })
  }
  
  async resumeGeneration(novelId) {
    return this.request(`/generation/novel/${novelId}/resume`, {
      method: 'POST',
    })
  }
  
  async regenerateChapter(chapterId, notes) {
    return this.request(`/generation/chapter/${chapterId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    })
  }
  
  async getGenerationStatus(novelId) {
    return this.request(`/generation/novel/${novelId}/status`)
  }
  
  // Story Bible
  async getStoryBible(novelId) {
    return this.request(`/bible/${novelId}`)
  }
  
  async updateStoryBible(novelId, data) {
    return this.request(`/bible/${novelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
  
  async createStoryBible(novelId, data) {
    return this.request(`/bible/${novelId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  // Chapters
  async getChapters(novelId) {
    return this.request(`/chapters/novel/${novelId}`)
  }
  
  async getChapter(chapterId) {
    return this.request(`/chapters/${chapterId}`)
  }
  
  async updateChapter(chapterId, data) {
    return this.request(`/chapters/${chapterId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
  
  async createChapter(data) {
    return this.request('/chapters', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  async deleteChapter(chapterId) {
    return this.request(`/chapters/${chapterId}`, {
      method: 'DELETE',
    })
  }
  
  // Export
  async exportEpub(novelId, options) {
    const response = await fetch(`${API_BASE}/export/epub/${novelId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })
    
    if (!response.ok) {
      throw new Error('Export failed')
    }
    
    return response.blob()
  }
  
  async exportJson(novelId) {
    const response = await fetch(`${API_BASE}/export/json/${novelId}`)
    
    if (!response.ok) {
      throw new Error('Export failed')
    }
    
    return response.blob()
  }
  
  // Settings / API Keys
  async validateApiKey(provider, key) {
    return this.request('/settings/validate-key', {
      method: 'POST',
      body: JSON.stringify({ provider, key }),
    })
  }
  
  async saveApiKey(provider, apiKey) {
    return this.request('/apikeys', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey }),
    })
  }
  
  async getApiKeys() {
    return this.request('/apikeys')
  }
  
  async deleteApiKey(provider) {
    return this.request(`/apikeys/${provider}`, {
      method: 'DELETE',
    })
  }
  
  // Models
  async getOllamaModels() {
    return this.request('/models/ollama')
  }
}

export const api = new ApiClient()
