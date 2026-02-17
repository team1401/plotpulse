import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { OllamaProvider } from './OllamaProvider.js';

export class AIService {
  constructor(apiKeyModel, ollamaBaseUrl = 'http://localhost:11434') {
    this.apiKeyModel = apiKeyModel;
    this.ollamaBaseUrl = ollamaBaseUrl;
    this.providers = new Map();
  }

  /**
   * Get or create a provider instance
   * @param {string} userId
   * @param {string} provider - 'anthropic', 'openai', or 'ollama'
   * @param {string} modelName
   * @returns {Promise<BaseAIProvider>}
   */
  async getProvider(userId, provider, modelName) {
    const cacheKey = `${userId}:${provider}:${modelName}`;
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey);
    }

    let providerInstance;

    switch (provider.toLowerCase()) {
      case 'anthropic': {
        const keyData = this.apiKeyModel.get(userId, 'anthropic');
        if (!keyData) {
          throw new Error('Anthropic API key not found');
        }
        providerInstance = new AnthropicProvider(keyData.apiKey, modelName);
        break;
      }

      case 'openai': {
        const keyData = this.apiKeyModel.get(userId, 'openai');
        if (!keyData) {
          throw new Error('OpenAI API key not found');
        }
        providerInstance = new OpenAIProvider(keyData.apiKey, modelName);
        break;
      }

      case 'ollama': {
        providerInstance = new OllamaProvider(this.ollamaBaseUrl, modelName);
        break;
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.providers.set(cacheKey, providerInstance);
    return providerInstance;
  }

  /**
   * Generate text using the specified provider and model
   * @param {string} userId
   * @param {string} provider
   * @param {string} modelName
   * @param {string} prompt
   * @param {object} options
   * @returns {Promise<{text: string, tokens: number, cost: number}>}
   */
  async generate(userId, provider, modelName, prompt, options = {}) {
    const providerInstance = await this.getProvider(userId, provider, modelName);
    return providerInstance.generate(prompt, options);
  }

  /**
   * List available Ollama models
   * @returns {Promise<Array>}
   */
  async listOllamaModels() {
    const ollama = new OllamaProvider(this.ollamaBaseUrl);
    return ollama.listModels();
  }

  /**
   * Clear provider cache (useful when API keys change)
   */
  clearCache(userId = null) {
    if (userId) {
      for (const key of this.providers.keys()) {
        if (key.startsWith(userId + ':')) {
          this.providers.delete(key);
        }
      }
    } else {
      this.providers.clear();
    }
  }
}
