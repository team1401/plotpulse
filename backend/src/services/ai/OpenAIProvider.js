import OpenAI from 'openai';
import { BaseAIProvider } from './BaseProvider.js';

// Pricing per 1M tokens (as of Feb 2026)
const PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },
  'o3': { input: 20.00, output: 80.00 },
  'o3-mini': { input: 1.10, output: 4.40 }
};

export class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey, modelName = 'gpt-4o') {
    super(apiKey, modelName);
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = null
    } = options;

    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      // O-series models don't support temperature or system messages
      const isOModel = this.modelName.startsWith('o1') || this.modelName.startsWith('o3');
      
      const params = {
        model: this.modelName,
        messages,
        max_completion_tokens: maxTokens
      };

      if (!isOModel) {
        params.temperature = temperature;
      }

      const response = await this.client.chat.completions.create(params);
      
      const text = response.choices[0].message.content;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;
      const totalTokens = response.usage.total_tokens;
      
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        text,
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        cost
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  calculateCost(inputTokens, outputTokens) {
    const pricing = PRICING[this.modelName] || PRICING['gpt-4o'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  countTokens(text) {
    // OpenAI's approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}
