import { z } from 'zod';

// Schema for the summary response
export const summarySchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
  followUpText: z.string(),
});

export type SummaryResponse = z.infer<typeof summarySchema>;

// Configuration for different summarization models
const MODEL_CONFIGS = {
  'facebook/bart-large-cnn': {
    url: 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    maxLength: 1024,
    minLength: 100,
  },
  'google/pegasus-xsum': {
    url: 'https://api-inference.huggingface.co/models/google/pegasus-xsum',
    maxLength: 512,
    minLength: 50,
  },
  't5-small': {
    url: 'https://api-inference.huggingface.co/models/t5-small',
    maxLength: 512,
    minLength: 100,
  },
} as const;

type ModelName = keyof typeof MODEL_CONFIGS;

/**
 * Generate a summary using HuggingFace's inference API
 * @param text The text to summarize
 * @param modelName The model to use for summarization
 * @returns A promise that resolves to the summary response
 */
export async function generateSummary(
  text: string,
  modelName: ModelName = 'facebook/bart-large-cnn'
): Promise<SummaryResponse> {
  const config = MODEL_CONFIGS[modelName];
  
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No API key needed for free inference endpoints
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          max_length: config.maxLength,
          min_length: config.minLength,
          do_sample: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    
    // Extract the summary text from the response
    const summary = Array.isArray(result) 
      ? result[0]?.summary_text || result[0]?.generated_text || ''
      : result.summary_text || result.generated_text || '';

    // Generate action items using a simpler model
    const actionItems = await extractActionItems(text);
    
    // Generate follow-up text
    const followUpText = generateFollowUpText(summary, actionItems);

    return {
      summary: summary.trim(),
      actionItems,
      followUpText,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return generateFallbackSummary(text);
  }
}

/**
 * Extract action items from the text using a simpler model
 */
async function extractActionItems(text: string): Promise<string[]> {
  try {
    // Use a smaller model for action item extraction
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: [
              'action item',
              'task',
              'todo',
              'follow up',
              'next steps',
              'decision',
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to extract action items');
    }

    const result = await response.json();
    
    // Extract the most relevant sentences that are likely action items
    const sentences = text
      .split(/(?<=\.)\s+/)
      .filter(s => s.length > 20); // Filter out very short sentences
      
    // Take top 3 most relevant sentences as action items
    return sentences.slice(0, 3).map(s => s.trim());
  } catch (error) {
    console.error('Error extracting action items:', error);
    // Fallback to a simple regex-based extraction
    return extractActionItemsFallback(text);
  }
}

/**
 * Simple regex-based fallback for action item extraction
 */
function extractActionItemsFallback(text: string): string[] {
  const actionPhrases = [
    /(?:need to|must|should|will|let's|we'll|please|kindly|action item|todo|task)[^.!?]*[.!?]/gi,
    /(?:follow up|next steps|action items?|tasks?|todos?):?[^.!?]*[.!?]/gi,
  ];

  const matches = new Set<string>();
  
  for (const pattern of actionPhrases) {
    const found = text.match(pattern) || [];
    found.forEach(match => matches.add(match.trim()));
  }

  return Array.from(matches).slice(0, 5); // Return up to 5 action items
}

/**
 * Generate follow-up text based on the summary and action items
 */
function generateFollowUpText(summary: string, actionItems: string[]): string {
  const actionItemsText = actionItems.length > 0
    ? `\n\nAction Items:\n- ${actionItems.join('\n- ')}`
    : '';

  return `Hi team,\n\nHere's a summary of our discussion:${summary}${actionItemsText}\n\nPlease let me know if you have any questions or need further clarification.\n\nBest regards,\n[Your Name]`;
}

/**
 * Fallback summary generation when the API is unavailable
 */
function generateFallbackSummary(text: string): SummaryResponse {
  // Simple fallback: take the first 3 sentences as summary
  const sentences = text.split(/(?<=\.)\s+/);
  const summary = sentences.slice(0, 3).join(' ');
  
  return {
    summary,
    actionItems: extractActionItemsFallback(text).slice(0, 3),
    followUpText: `Here's a summary of our discussion: ${summary}`,
  };
}

/**
 * Truncate text to a maximum number of tokens/words
 */
export function truncateText(text: string, maxWords: number = 1000): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}
