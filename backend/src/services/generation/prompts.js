export const OUTLINE_GENERATION_PROMPT = `You are an expert novel outline generator. Given a premise, create a detailed outline for a complete novel.

PREMISE:
{premise}

TARGET LENGTH: {targetWordCount} words (~{chapterCount} chapters of ~{wordsPerChapter} words each)

Generate a comprehensive outline in JSON format with the following structure:

{
  "title": "Compelling novel title",
  "genre": "Primary genre",
  "themes": ["Theme 1", "Theme 2", "Theme 3"],
  "tone": "Description of tone and voice",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "Detailed 2-3 sentence summary of what happens",
      "keyEvents": ["Event 1", "Event 2"],
      "targetWordCount": {wordsPerChapter}
    }
  ],
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting",
      "description": "Physical appearance and personality",
      "arc": "Character development throughout story",
      "relationships": ["Key relationships"]
    }
  ],
  "worldDetails": {
    "setting": "Where and when",
    "rules": "Important world rules (magic, tech, society)",
    "locations": ["Key location descriptions"]
  }
}

Make it compelling, well-structured, and suitable for the target word count.`;

export const CHAPTER_GENERATION_PROMPT = `You are an expert novelist. Write the next chapter of this novel.

NOVEL TITLE: {title}
CHAPTER {chapterNumber}: {chapterTitle}

CHAPTER OUTLINE:
{chapterOutline}

STORY BIBLE (maintain consistency):
{storyBible}

PREVIOUS CHAPTER SUMMARY:
{previousSummary}

TARGET WORD COUNT: {targetWordCount} words

INSTRUCTIONS:
- Write engaging, vivid prose in the established tone and style
- Follow the outline but allow natural story evolution
- Maintain character consistency (voices, behaviors, descriptions)
- Respect world rules and previously established facts
- Hit the target word count (within 10%)
- End with a compelling hook if not the final chapter
- Use proper formatting with paragraph breaks

Write the chapter now:`;

export const EXPANSION_PROMPT = `The previous chapter was {actualWordCount} words but should be {targetWordCount} words. 

EXPAND this chapter to meet the target word count while:
- Adding more sensory details and descriptions
- Deepening character emotions and internal thoughts
- Expanding dialogue and interactions
- Building atmosphere and tension
- Maintaining pacing and quality

Do NOT:
- Add new plot points or events
- Change the core story beats
- Pad with unnecessary repetition

CHAPTER TO EXPAND:
{chapterContent}

Write the expanded version now:`;

export const BIBLE_UPDATE_PROMPT = `Update the story bible based on this newly written chapter.

CURRENT STORY BIBLE:
{currentBible}

NEW CHAPTER:
{chapterContent}

Extract and add:
- New or updated character details (appearance, personality, relationships)
- New world rules, locations, or setting details
- Important events for the timeline
- Recurring themes or motifs
- Tone/style notes if significant shifts occurred

Return ONLY a JSON object with updated bible sections:
{
  "characters": {...},
  "world_rules": {...},
  "timeline": [...],
  "themes": [...],
  "tone_guide": "...",
  "style_reference": "..."
}`;

export const SUMMARY_PROMPT = `Summarize this chapter in 2-3 sentences for context in writing the next chapter.

Focus on:
- Key events and plot developments
- Character developments or revelations
- Emotional/thematic beats
- Cliffhangers or hooks

CHAPTER:
{chapterContent}

Summary:`;
