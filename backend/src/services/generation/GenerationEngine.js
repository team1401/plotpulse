import * as prompts from './prompts.js';

export class GenerationEngine {
  constructor(aiService, novelModel, chapterModel, bibleModel, outlineModel, queueModel) {
    this.ai = aiService;
    this.novels = novelModel;
    this.chapters = chapterModel;
    this.bibles = bibleModel;
    this.outlines = outlineModel;
    this.queue = queueModel;
  }

  /**
   * Generate outline from premise (Spark Mode)
   */
  async generateOutline(novelId, socketEmit = null) {
    const novel = this.novels.findById(novelId);
    if (!novel) throw new Error('Novel not found');

    const emit = (event, data) => {
      if (socketEmit) socketEmit(event, { novelId, ...data });
    };

    emit('outline:start', { novelId });

    const chapterCount = Math.ceil(novel.target_word_count / 3000);
    const wordsPerChapter = Math.floor(novel.target_word_count / chapterCount);

    const prompt = prompts.OUTLINE_GENERATION_PROMPT
      .replace('{premise}', novel.premise)
      .replace('{targetWordCount}', novel.target_word_count)
      .replace('{chapterCount}', chapterCount)
      .replace(/{wordsPerChapter}/g, wordsPerChapter);

    try {
      const result = await this.ai.generate(
        novel.user_id,
        novel.model_provider,
        novel.model_name,
        prompt,
        { temperature: novel.temperature, maxTokens: 8192 }
      );

      // Parse the outline (strip markdown fencing if present)
      let jsonText = result.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const outlineData = JSON.parse(jsonText);

      // Store outline
      this.outlines.create(novelId, {
        chapter_summaries: JSON.stringify(outlineData.chapters),
        character_profiles: JSON.stringify(outlineData.characters),
        world_details: JSON.stringify(outlineData.worldDetails),
        theme_notes: JSON.stringify(outlineData.themes)
      });

      // Initialize story bible
      this.bibles.create(novelId, {
        characters: JSON.stringify(outlineData.characters.reduce((acc, char) => {
          acc[char.name] = char;
          return acc;
        }, {})),
        world_rules: JSON.stringify(outlineData.worldDetails),
        themes: JSON.stringify(outlineData.themes),
        tone_guide: outlineData.tone
      });

      // Update novel title if generated
      if (outlineData.title) {
        this.novels.update(novelId, { title: outlineData.title });
      }

      // Track cost
      this.novels.incrementCost(novelId, result.cost, result.tokens);

      emit('outline:complete', { outline: outlineData, cost: result.cost });

      return outlineData;
    } catch (error) {
      emit('outline:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate a single chapter
   */
  async generateChapter(chapterId, socketEmit = null) {
    const chapter = this.chapters.findById(chapterId);
    if (!chapter) throw new Error('Chapter not found');

    const novel = this.novels.findById(chapter.novel_id);
    if (!novel) throw new Error('Novel not found');

    const emit = (event, data) => {
      if (socketEmit) socketEmit(event, { novelId: novel.id, chapterId, ...data });
    };

    emit('chapter:start', { chapterNumber: chapter.chapter_number });

    this.chapters.update(chapterId, { status: 'generating' });
    this.chapters.incrementAttempts(chapterId);

    try {
      // Get story bible
      const bible = this.bibles.findByNovel(novel.id);
      const bibleText = this.formatBibleForPrompt(bible);

      // Get previous chapter summary
      const prevChapter = this.chapters.getPreviousChapter(novel.id, chapter.chapter_number);
      let previousSummary = 'This is the first chapter.';
      
      if (prevChapter && prevChapter.content) {
        previousSummary = await this.generateSummary(
          novel.user_id,
          novel.model_provider,
          novel.model_name,
          prevChapter.content
        );
      }

      // Generate chapter
      const targetWordCount = chapter.outline 
        ? this.extractTargetWordCount(chapter.outline)
        : Math.floor(novel.target_word_count / 25); // ~3000 words default

      const prompt = prompts.CHAPTER_GENERATION_PROMPT
        .replace('{title}', novel.title)
        .replace('{chapterNumber}', chapter.chapter_number)
        .replace('{chapterTitle}', chapter.title || `Chapter ${chapter.chapter_number}`)
        .replace('{chapterOutline}', chapter.outline || 'Continue the story naturally.')
        .replace('{storyBible}', bibleText)
        .replace('{previousSummary}', previousSummary)
        .replace('{targetWordCount}', targetWordCount);

      let result = await this.ai.generate(
        novel.user_id,
        novel.model_provider,
        novel.model_name,
        prompt,
        { temperature: novel.temperature, maxTokens: 8192 }
      );

      let content = result.text;
      let wordCount = this.countWords(content);
      let totalCost = result.cost;
      let totalTokens = result.tokens;

      // Word count enforcement
      const tolerance = 0.1; // 10% tolerance
      const minWords = targetWordCount * (1 - tolerance);

      if (wordCount < minWords) {
        emit('chapter:expanding', { 
          currentWords: wordCount, 
          targetWords: targetWordCount 
        });

        const expansionPrompt = prompts.EXPANSION_PROMPT
          .replace('{actualWordCount}', wordCount)
          .replace('{targetWordCount}', targetWordCount)
          .replace('{chapterContent}', content);

        const expansionResult = await this.ai.generate(
          novel.user_id,
          novel.model_provider,
          novel.model_name,
          expansionPrompt,
          { temperature: novel.temperature, maxTokens: 8192 }
        );

        content = expansionResult.text;
        wordCount = this.countWords(content);
        totalCost += expansionResult.cost;
        totalTokens += expansionResult.tokens;
      }

      // Update chapter
      this.chapters.update(chapterId, {
        content,
        word_count: wordCount,
        status: 'completed',
        cost: totalCost,
        tokens_used: totalTokens
      });

      // Update novel stats
      this.novels.incrementCost(novel.id, totalCost, totalTokens);
      this.novels.incrementWordCount(novel.id, wordCount);

      // Update story bible
      await this.updateBible(novel.id, novel.user_id, novel.model_provider, novel.model_name, content);

      emit('chapter:complete', { 
        chapterNumber: chapter.chapter_number,
        wordCount,
        cost: totalCost
      });

      return this.chapters.findById(chapterId);
    } catch (error) {
      this.chapters.update(chapterId, { 
        status: 'failed',
        error_message: error.message 
      });
      emit('chapter:error', { 
        chapterNumber: chapter.chapter_number,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update story bible based on new chapter
   */
  async updateBible(novelId, userId, provider, model, chapterContent) {
    const bible = this.bibles.findByNovel(novelId);
    if (!bible) return;

    const prompt = prompts.BIBLE_UPDATE_PROMPT
      .replace('{currentBible}', JSON.stringify(bible, null, 2))
      .replace('{chapterContent}', chapterContent);

    try {
      const result = await this.ai.generate(userId, provider, model, prompt, {
        temperature: 0.5,
        maxTokens: 2048
      });

      let bibleJson = result.text.trim();
      if (bibleJson.startsWith('```')) {
        bibleJson = bibleJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const updates = JSON.parse(bibleJson);
      this.bibles.update(novelId, updates);
    } catch (error) {
      console.error('Failed to update story bible:', error.message);
      // Non-critical, don't throw
    }
  }

  /**
   * Generate chapter summary
   */
  async generateSummary(userId, provider, model, chapterContent) {
    const prompt = prompts.SUMMARY_PROMPT.replace('{chapterContent}', chapterContent);

    try {
      const result = await this.ai.generate(userId, provider, model, prompt, {
        temperature: 0.5,
        maxTokens: 256
      });
      return result.text;
    } catch (error) {
      console.error('Failed to generate summary:', error.message);
      return 'Previous chapter continued the story.';
    }
  }

  /**
   * Helper: Format bible for prompt
   */
  formatBibleForPrompt(bible) {
    if (!bible) return 'No story bible yet.';

    const sections = [];

    try {
      const chars = JSON.parse(bible.characters || '{}');
      if (Object.keys(chars).length > 0) {
        sections.push('CHARACTERS:\n' + JSON.stringify(chars, null, 2));
      }
    } catch (e) {}

    try {
      const world = JSON.parse(bible.world_rules || '{}');
      if (Object.keys(world).length > 0) {
        sections.push('WORLD:\n' + JSON.stringify(world, null, 2));
      }
    } catch (e) {}

    if (bible.tone_guide) {
      sections.push('TONE: ' + bible.tone_guide);
    }

    return sections.join('\n\n') || 'No story bible yet.';
  }

  /**
   * Helper: Extract target word count from outline
   */
  extractTargetWordCount(outline) {
    try {
      const parsed = JSON.parse(outline);
      return parsed.targetWordCount || 3000;
    } catch (e) {
      return 3000;
    }
  }

  /**
   * Helper: Count words
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }
}
