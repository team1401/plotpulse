import { BaseAIProvider } from './BaseProvider.js';

export class OllamaProvider extends BaseAIProvider {
  constructor(baseUrl = 'http://localhost:11434', modelName = 'llama2') {
    super(null, modelName);
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      systemPrompt = null
    } = options;

    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: fullPrompt,
          temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${error}`);
      }

      const data = await response.json();
      const text = data.response;
      
      // Ollama provides approximate token counts
      const inputTokens = data.prompt_eval_count || this.countTokens(fullPrompt);
      const outputTokens = data.eval_count || this.countTokens(text);
      const totalTokens = inputTokens + outputTokens;

      return {
        text,
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        cost: 0 // Local models are free
      };
    } catch (error) {
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  calculateCost(inputTokens, outputTokens) {
    return 0; // Local models are free
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch Ollama models');
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }
}
