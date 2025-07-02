import { z } from 'zod';
import { callHuggingFace, parseHuggingFaceResponse, getModelConfig } from './huggingface';

// Schema for the summary response
export const summarySchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
  followUpText: z.string(),
});

export type SummaryResponse = z.infer<typeof summarySchema>;

type ModelName = 'facebook/bart-large-cnn' | 'google/pegasus-xsum' | 't5-small';

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
  try {
    // First, generate the main summary
    const summary = await generateTextSummary(text, modelName);
    
    // Then extract action items in parallel with follow-up text generation
    const [actionItems, followUpText] = await Promise.all([
      extractActionItems(text),
      generateFollowUpText(summary, []), // Generate basic follow-up text first
    ]);
    
    // Update follow-up text with action items
    const enhancedFollowUpText = actionItems.length > 0
      ? updateFollowUpWithActionItems(followUpText, actionItems)
      : followUpText;

    return {
      summary: summary.trim(),
      actionItems,
      followUpText: enhancedFollowUpText,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return generateFallbackSummary(text);
  }
}

/**
 * Generate a text summary using the specified model
 */
async function generateTextSummary(text: string, modelName: ModelName): Promise<string> {
  const config = getModelConfig(modelName);
  
  try {
    const response = await callHuggingFace(
      modelName,
      text,
      {
        max_length: config.maxLength,
        min_length: config.minLength,
        do_sample: false,
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000, // 30 seconds
      }
    );
    
    return parseHuggingFaceResponse(response);
  } catch (error) {
    console.error(`Error with model ${modelName}:`, error);
    
    // Try fallback models if the primary model fails
    if (modelName !== 'facebook/bart-large-cnn') {
      return generateTextSummary(text, 'facebook/bart-large-cnn');
    }
    
    throw error; // Re-throw if all fallbacks fail
  }
}

/**
 * Extract action items from the text using a simpler model
 */
async function extractActionItems(text: string): Promise<string[]> {
  try {
    // First, try to extract using a more sophisticated approach
    const actionItems = await extractActionItemsWithModel(text);
    if (actionItems.length > 0) {
      return actionItems;
    }
    
    // Fall back to regex if model extraction fails
    return extractActionItemsFallback(text);
  } catch (error) {
    console.error('Error extracting action items:', error);
    return extractActionItemsFallback(text);
  }
}

/**
 * Extract action items using a model
 */
async function extractActionItemsWithModel(text: string): Promise<string[]> {
  try {
    const response = await callHuggingFace(
      'facebook/bart-large-mnli',
      {
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
      },
      {},
      {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 20000, // 20 seconds
      }
    );

    // Extract sentences that are likely action items
    const sentences = text
      .split(/(?<=\.)\s+/)
      .filter(s => s.length > 20 && !s.startsWith('http')); // Filter out very short sentences and URLs

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

  return `Hi team,\n\nHere's a summary of our discussion:\n\n${summary}${actionItemsText}\n\nPlease let me know if you have any questions or need further clarification.\n\nBest regards,\n[Your Name]`;
}

/**
 * Update follow-up text with action items
 */
function updateFollowUpWithActionItems(followUpText: string, actionItems: string[]): string {
  if (actionItems.length === 0) return followUpText;
  
  const actionItemsSection = `\n\nAction Items:\n- ${actionItems.join('\n- ')}`;
  
  // Check if action items are already in the follow-up text
  if (followUpText.includes('Action Items:')) {
    // Replace existing action items
    return followUpText.replace(
      /Action Items:[\s\S]*?(?=\n\n|$)/,
      `Action Items:${actionItemsSection.substring(13)}` // Remove 'Action Items:' from the section
    );
  }
  
  // Add action items before the closing
  return followUpText.replace(
    /\n\nBest regards,/,
    `${actionItemsSection}\n\nBest regards,`
  );
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
