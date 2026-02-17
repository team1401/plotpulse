/**
 * Cost Tracking Service
 * Tracks API usage and enforces spending limits
 */

// Model pricing (as of Feb 2026 - update regularly!)
const MODEL_PRICING = {
  anthropic: {
    'claude-opus-4': { input: 0.015, output: 0.075 }, // per 1K tokens
    'claude-sonnet-4': { input: 0.003, output: 0.015 },
    'claude-sonnet-3.5': { input: 0.003, output: 0.015 }
  },
  openai: {
    'gpt-4o': { input: 0.0025, output: 0.010 },
    'gpt-4-turbo': { input: 0.010, output: 0.030 },
    'o1': { input: 0.015, output: 0.060 },
    'o3': { input: 0.020, output: 0.080 }
  },
  ollama: {
    // Local models - no cost
    'llama2': { input: 0, output: 0 },
    'mistral': { input: 0, output: 0 }
  }
};

/**
 * Calculate cost for a generation
 */
export function calculateCost(provider, model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[provider]?.[model];
  
  if (!pricing) {
    console.warn(`[Cost] Unknown pricing for ${provider}/${model}, using default`);
    return {
      inputCost: (inputTokens / 1000) * 0.003,
      outputCost: (outputTokens / 1000) * 0.015,
      totalCost: ((inputTokens / 1000) * 0.003) + ((outputTokens / 1000) * 0.015)
    };
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

/**
 * Estimate cost for a novel generation
 */
export function estimateNovelCost(outline, provider, model) {
  const pricing = MODEL_PRICING[provider]?.[model];
  
  if (!pricing) {
    return {
      estimatedCost: null,
      error: `Unknown model: ${provider}/${model}`
    };
  }
  
  // Rough estimates:
  // - Average chapter: 3500 words = ~4600 tokens output
  // - Story bible: starts at ~2000 tokens, grows to ~8000 tokens
  // - Outline context: ~1000 tokens per chapter
  // - Previous chapter summary: ~500 tokens
  
  const numChapters = outline.chapters?.length || 20;
  const avgBibleSize = 5000; // tokens (grows over time, this is average)
  const outlineContextPerChapter = 1000;
  const prevChapterSummary = 500;
  const outputTokensPerChapter = 4600;
  
  // Input tokens per chapter
  const inputPerChapter = avgBibleSize + outlineContextPerChapter + prevChapterSummary;
  
  // Total input tokens
  const totalInput = inputPerChapter * numChapters;
  
  // Total output tokens
  const totalOutput = outputTokensPerChapter * numChapters;
  
  const cost = calculateCost(provider, model, totalInput, totalOutput);
  
  return {
    estimatedCost: cost.totalCost,
    estimatedTokens: cost.totalTokens,
    breakdown: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost
    },
    perChapter: {
      tokens: inputPerChapter + outputTokensPerChapter,
      cost: (cost.totalCost / numChapters)
    },
    confidence: 'approximate',
    note: 'Actual cost may vary based on story complexity and bible size'
  };
}

/**
 * Check if user has exceeded spending limits
 */
export function checkSpendingLimit(db, userId, estimatedCost) {
  // Get user's spending in last 24 hours
  const dailySpending = db.prepare(`
    SELECT COALESCE(SUM(total_cost), 0) as spent
    FROM novels
    WHERE user_id = ?
      AND created_at > ?
  `).get(userId, Date.now() - (24 * 60 * 60 * 1000));
  
  // Get user's spending limit (default from env, or custom per user)
  const userLimit = db.prepare(`
    SELECT spending_limit_daily FROM users WHERE id = ?
  `).get(userId);
  
  const limit = userLimit?.spending_limit_daily || 
                parseFloat(process.env.DAILY_SPENDING_LIMIT || '50');
  
  const remaining = limit - dailySpending.spent;
  
  return {
    canProceed: remaining >= estimatedCost,
    currentSpending: dailySpending.spent,
    limit: limit,
    remaining: remaining,
    estimatedCost: estimatedCost,
    exceedsBy: estimatedCost > remaining ? estimatedCost - remaining : 0
  };
}

/**
 * Track spending for a chapter generation
 */
export function trackChapterCost(db, novelId, chapterId, cost, tokens) {
  const transaction = db.transaction(() => {
    // Update chapter
    db.prepare(`
      UPDATE chapters
      SET cost = ?,
          tokens_used = ?,
          updated_at = ?
      WHERE id = ?
    `).run(cost.totalCost, cost.totalTokens, Date.now(), chapterId);
    
    // Update novel totals
    db.prepare(`
      UPDATE novels
      SET total_cost = total_cost + ?,
          total_tokens = total_tokens + ?,
          updated_at = ?
      WHERE id = ?
    `).run(cost.totalCost, cost.totalTokens, Date.now(), novelId);
  });
  
  transaction();
}

/**
 * Get spending analytics for a user
 */
export function getSpendingAnalytics(db, userId, timeRange = 30) {
  const cutoff = Date.now() - (timeRange * 24 * 60 * 60 * 1000);
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_novels,
      SUM(total_cost) as total_spent,
      AVG(total_cost) as avg_cost_per_novel,
      SUM(total_tokens) as total_tokens,
      MAX(total_cost) as max_novel_cost,
      MIN(total_cost) as min_novel_cost
    FROM novels
    WHERE user_id = ?
      AND created_at > ?
      AND status != 'deleted'
  `).get(userId, cutoff);
  
  // Daily breakdown
  const dailyStats = db.prepare(`
    SELECT 
      DATE(created_at / 1000, 'unixepoch') as date,
      COUNT(*) as novels_started,
      SUM(total_cost) as daily_cost
    FROM novels
    WHERE user_id = ?
      AND created_at > ?
    GROUP BY date
    ORDER BY date DESC
  `).all(userId, cutoff);
  
  // By model
  const byModel = db.prepare(`
    SELECT 
      model_provider,
      model_name,
      COUNT(*) as count,
      SUM(total_cost) as cost,
      AVG(total_cost) as avg_cost
    FROM novels
    WHERE user_id = ?
      AND created_at > ?
      AND model_provider IS NOT NULL
    GROUP BY model_provider, model_name
    ORDER BY cost DESC
  `).all(userId, cutoff);
  
  return {
    summary: stats,
    daily: dailyStats,
    byModel: byModel,
    timeRange: timeRange
  };
}

/**
 * Get current model pricing (for frontend display)
 */
export function getModelPricing() {
  return MODEL_PRICING;
}

/**
 * Compare costs across models for an outline
 */
export function compareModelCosts(outline) {
  const comparisons = [];
  
  for (const [provider, models] of Object.entries(MODEL_PRICING)) {
    for (const model of Object.keys(models)) {
      const estimate = estimateNovelCost(outline, provider, model);
      
      if (!estimate.error) {
        comparisons.push({
          provider,
          model,
          ...estimate
        });
      }
    }
  }
  
  // Sort by cost
  comparisons.sort((a, b) => a.estimatedCost - b.estimatedCost);
  
  return comparisons;
}
