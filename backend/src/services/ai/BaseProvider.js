export class BaseAIProvider {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * Generate text completion
   * @param {string} prompt - The prompt text
   * @param {object} options - Generation options
   * @returns {Promise<{text: string, tokens: number, cost: number}>}
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by provider');
  }

  /**
   * Count tokens in text (approximate)
   * @param {string} text
   * @returns {number}
   */
  countTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost based on tokens and model
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @returns {number} Cost in USD
   */
  calculateCost(inputTokens, outputTokens) {
    throw new Error('calculateCost() must be implemented by provider');
  }

  /**
   * Get model information
   * @returns {object}
   */
  getModelInfo() {
    return {
      provider: this.constructor.name.replace('Provider', '').toLowerCase(),
      model: this.modelName
    };
  }
}
