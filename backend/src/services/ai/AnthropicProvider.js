import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './BaseProvider.js';

// Pricing per 1M tokens (as of Feb 2026)
const PRICING = {
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-sonnet-3-5': { input: 3.00, output: 15.00 },
  'claude-haiku-3-5': { input: 0.80, output: 4.00 }
};

// Map friendly names to full Anthropic model IDs
const MODEL_MAP = {
  'claude-opus-4': 'claude-opus-4-20250514',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-sonnet-3-5': 'claude-3-5-sonnet-20241022',
  'claude-haiku-3-5': 'claude-3-5-haiku-20241022'
};

export class AnthropicProvider extends BaseAIProvider {
  constructor(apiKey, modelName = 'claude-sonnet-4') {
    super(apiKey, modelName);
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = null
    } = options;

    try {
      const messages = [{ role: 'user', content: prompt }];
      
      const params = {
        model: MODEL_MAP[this.modelName] || this.modelName,
        max_tokens: maxTokens,
        temperature,
        messages
      };

      if (systemPrompt) {
        params.system = systemPrompt;
      }

      const response = await this.client.messages.create(params);
      
      const text = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        text,
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        cost
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  calculateCost(inputTokens, outputTokens) {
    const pricing = PRICING[this.modelName] || PRICING['claude-sonnet-4'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  countTokens(text) {
    // Anthropic's approximation: ~3.5 chars per token
    return Math.ceil(text.length / 3.5);
  }
}
