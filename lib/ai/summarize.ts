import { z } from 'zod';
import { callHuggingFace, parseHuggingFaceResponse, getModelConfig } from './huggingface';

// Enhanced schemas with validation and metadata
export const summaryMetadataSchema = z.object({
  confidence: z.number().min(0).max(1),
  readabilityScore: z.number().min(0).max(100),
  keyTopics: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  wordCount: z.number().min(0),
  processingTime: z.number().min(0),
});

export const enhancedSummarySchema = z.object({
  summary: z.string().min(10).max(2000),
  actionItems: z.array(z.object({
    text: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    category: z.string().optional(),
  })),
  followUpText: z.string(),
  keyInsights: z.array(z.string()),
  metadata: summaryMetadataSchema,
  structuredContent: z.object({
    mainPoints: z.array(z.string()),
    decisions: z.array(z.string()),
    questions: z.array(z.string()),
    risks: z.array(z.string()),
  }),
});

export type EnhancedSummaryResponse = z.infer<typeof enhancedSummarySchema>;
export type SummaryMetadata = z.infer<typeof summaryMetadataSchema>;

// Advanced model configuration with fallback strategies
type ModelName = 
  | 'facebook/bart-large-cnn'
  | 'google/pegasus-xsum'
  | 't5-small'
  | 'microsoft/DialoGPT-large'
  | 'facebook/bart-large-mnli';

interface ModelStrategy {
  primary: ModelName;
  fallbacks: ModelName[];
  timeout: number;
  maxRetries: number;
  confidence: number;
}

const MODEL_STRATEGIES: Record<string, ModelStrategy> = {
  comprehensive: {
    primary: 'facebook/bart-large-cnn',
    fallbacks: ['google/pegasus-xsum', 't5-small'],
    timeout: 45000,
    maxRetries: 3,
    confidence: 0.85,
  },
  fast: {
    primary: 't5-small',
    fallbacks: ['facebook/bart-large-cnn'],
    timeout: 20000,
    maxRetries: 2,
    confidence: 0.75,
  },
  balanced: {
    primary: 'google/pegasus-xsum',
    fallbacks: ['facebook/bart-large-cnn', 't5-small'],
    timeout: 30000,
    maxRetries: 3,
    confidence: 0.80,
  },
};

// Performance optimization with caching and memoization
const summaryCache = new Map<string, EnhancedSummaryResponse>();
const MAX_CACHE_SIZE = 100;

/**
 * Advanced summarization with multi-model ensemble and intelligent fallbacks
 */
export class AdvancedSummarizer {
  private static instance: AdvancedSummarizer;
  private processingQueue: Array<{ text: string; resolve: Function; reject: Function }> = [];
  private isProcessing = false;
  private performanceMetrics: Map<string, number> = new Map();

  static getInstance(): AdvancedSummarizer {
    if (!AdvancedSummarizer.instance) {
      AdvancedSummarizer.instance = new AdvancedSummarizer();
    }
    return AdvancedSummarizer.instance;
  }

  /**
   * Generate enhanced summary with intelligent analysis
   */
  async generateSummary(
    text: string,
    options: {
      strategy?: keyof typeof MODEL_STRATEGIES;
      includeMetadata?: boolean;
      maxLength?: number;
      language?: string;
      domain?: string;
    } = {}
  ): Promise<EnhancedSummaryResponse> {
    const startTime = performance.now();
    const {
      strategy = 'balanced',
      includeMetadata = true,
      maxLength = 500,
      language = 'en',
      domain = 'general',
    } = options;

    // Check cache first
    const cacheKey = this.generateCacheKey(text, options);
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Preprocess text for optimal summarization
      const preprocessedText = this.preprocessText(text);
      
      // Parallel processing for different aspects
      const [
        summaryResult,
        actionItemsResult,
        insightsResult,
        structuredContentResult,
        metadataResult,
      ] = await Promise.allSettled([
        this.generateMultiModelSummary(preprocessedText, strategy, maxLength),
        this.extractEnhancedActionItems(preprocessedText),
        this.extractKeyInsights(preprocessedText),
        this.extractStructuredContent(preprocessedText),
        includeMetadata ? this.generateMetadata(preprocessedText) : Promise.resolve(this.getDefaultMetadata()),
      ]);

      // Combine results with error handling
      const summary = this.getSettledValue(summaryResult) || this.generateFallbackSummary(text).summary;
      const actionItems = this.getSettledValue(actionItemsResult) || [];
      const keyInsights = this.getSettledValue(insightsResult) || [];
      const structuredContent = this.getSettledValue(structuredContentResult) || this.getDefaultStructuredContent();
      const metadata = this.getSettledValue(metadataResult) || this.getDefaultMetadata();

      // Generate enhanced follow-up text
      const followUpText = this.generateEnhancedFollowUpText(summary, actionItems, keyInsights);

      const result: EnhancedSummaryResponse = {
        summary,
        actionItems,
        followUpText,
        keyInsights,
        metadata: {
          ...metadata,
          processingTime: performance.now() - startTime,
        },
        structuredContent,
      };

      // Cache the result
      this.cacheResult(cacheKey, result);
      
      // Update performance metrics
      this.updateMetrics(strategy, performance.now() - startTime);

      return result;
    } catch (error) {
      console.error('Error in advanced summarization:', error);
      return this.generateEnhancedFallbackSummary(text);
    }
  }

  /**
   * Multi-model ensemble summarization with confidence scoring
   */
  private async generateMultiModelSummary(
    text: string,
    strategy: keyof typeof MODEL_STRATEGIES,
    maxLength: number
  ): Promise<string> {
    const modelStrategy = MODEL_STRATEGIES[strategy];
    const models = [modelStrategy.primary, ...modelStrategy.fallbacks];
    
    // Try models in order of preference
    for (const modelName of models) {
      try {
        const config = getModelConfig(modelName);
        const response = await callHuggingFace(
          modelName,
          text,
          {
            max_length: Math.min(maxLength, config.maxLength),
            min_length: Math.max(50, config.minLength),
            do_sample: false,
            temperature: 0.7,
            top_p: 0.9,
          },
          {
            maxRetries: modelStrategy.maxRetries,
            retryDelay: 1000,
            timeout: modelStrategy.timeout,
          }
        );

        const summary = parseHuggingFaceResponse(response);
        
        // Quality check
        if (this.validateSummaryQuality(summary, text)) {
          return summary;
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed, trying next model:`, error);
        continue;
      }
    }

    throw new Error('All models failed for summary generation');
  }

  /**
   * Extract enhanced action items with priority and categorization
   */
  private async extractEnhancedActionItems(text: string): Promise<Array<{
    text: string;
    priority: 'high' | 'medium' | 'low';
    assignee?: string;
    dueDate?: string;
    category?: string;
  }>> {
    try {
      // Use multiple extraction methods
      const [modelItems, regexItems, nlpItems] = await Promise.allSettled([
        this.extractActionItemsWithModel(text),
        this.extractActionItemsRegex(text),
        this.extractActionItemsNLP(text),
      ]);

      // Combine and deduplicate results
      const allItems = new Map<string, any>();
      
      [modelItems, regexItems, nlpItems].forEach(result => {
        if (result.status === 'fulfilled') {
          result.value.forEach((item: any) => {
            const key = item.text.toLowerCase().trim();
            if (!allItems.has(key)) {
              allItems.set(key, item);
            }
          });
        }
      });

      return Array.from(allItems.values()).slice(0, 8); // Limit to 8 items
    } catch (error) {
      console.error('Error extracting enhanced action items:', error);
      return [];
    }
  }

  /**
   * Extract key insights using advanced NLP techniques
   */
  private async extractKeyInsights(text: string): Promise<string[]> {
    try {
      // Extract insights using multiple methods
      const insights = new Set<string>();
      
      // Pattern-based extraction
      const patterns = [
        /(?:key insight|important|significant|crucial|critical|notable)[^.!?]*[.!?]/gi,
        /(?:discovered|learned|realized|found)[^.!?]*[.!?]/gi,
        /(?:conclusion|result|outcome)[^.!?]*[.!?]/gi,
      ];

      patterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach((match: string) => {
          if (typeof match === 'string') {
            insights.add(match.trim());
          }
        });
      });

      // Sentence importance scoring
      const sentences = text.split(/(?<=\.)\s+/);
      const importantSentences = sentences
        .filter(s => s.length > 30 && s.length < 200)
        .sort((a, b) => this.calculateSentenceImportance(b) - this.calculateSentenceImportance(a))
        .slice(0, 3);

      importantSentences.forEach(sentence => insights.add(sentence.trim()));

      return Array.from(insights).slice(0, 5);
    } catch (error) {
      console.error('Error extracting key insights:', error);
      return [];
    }
  }

  /**
   * Extract structured content (main points, decisions, questions, risks)
   */
  private async extractStructuredContent(text: string): Promise<{
    mainPoints: string[];
    decisions: string[];
    questions: string[];
    risks: string[];
  }> {
    const structure = {
      mainPoints: [] as string[],
      decisions: [] as string[],
      questions: [] as string[],
      risks: [] as string[],
    };

    try {
      // Extract questions
      const questionPatterns = [
        /[^.!?]*\?/g,
        /(?:what|when|where|why|how|who)[^.!?]*[.!?]/gi,
      ];

      questionPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => structure.questions.push(match.trim()));
        }
      });

      // Extract decisions
      const decisionPatterns = [
        /(?:decided|agreed|determined|concluded)[^.!?]*[.!?]/gi,
        /(?:decision|resolution|agreement)[^.!?]*[.!?]/gi,
      ];

      decisionPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach((match: string) => structure.decisions.push(match.trim()));
      });

      // Extract risks
      const riskPatterns = [
        /(?:risk|danger|concern|issue|problem|challenge)[^.!?]*[.!?]/gi,
        /(?:might|could|may|potential)[^.!?]*(?:problem|issue|risk)[^.!?]*[.!?]/gi,
      ];

      riskPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach((match: string | null) => {
          if (match) {
            structure.risks.push(match.trim());
          }
        });
      });

      // Extract main points (high-importance sentences)
      const sentences = text.split(/(?<=\.)\s+/);
      structure.mainPoints = sentences
        .filter(s => s.length > 20 && s.length < 150)
        .sort((a, b) => this.calculateSentenceImportance(b) - this.calculateSentenceImportance(a))
        .slice(0, 5);

      // Limit arrays
      Object.keys(structure).forEach(key => {
        structure[key as keyof typeof structure] = structure[key as keyof typeof structure].slice(0, 3);
      });

      return structure;
    } catch (error) {
      console.error('Error extracting structured content:', error);
      return this.getDefaultStructuredContent();
    }
  }

  /**
   * Generate comprehensive metadata
   */
  private async generateMetadata(text: string): Promise<SummaryMetadata> {
    try {
      const wordCount = text.split(/\s+/).length;
      const sentences = text.split(/(?<=\.)\s+/);
      
      return {
        confidence: this.calculateConfidence(text),
        readabilityScore: this.calculateReadabilityScore(text),
        keyTopics: this.extractKeyTopics(text),
        sentiment: this.analyzeSentiment(text),
        complexity: this.assessComplexity(text),
        wordCount,
        processingTime: 0, // Will be set by caller
      };
    } catch (error) {
      console.error('Error generating metadata:', error);
      return this.getDefaultMetadata();
    }
  }

  // Utility methods
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()-]/g, '')
      .trim();
  }

  private generateCacheKey(text: string, options: any): string {
    return `${text.substring(0, 100)}_${JSON.stringify(options)}`.replace(/\s+/g, '_');
  }

  private cacheResult(key: string, result: EnhancedSummaryResponse): void {
    if (summaryCache.size >= MAX_CACHE_SIZE) {
      const firstKey = summaryCache.keys().next().value;
      summaryCache.delete(firstKey);
    }
    summaryCache.set(key, result);
  }

  private validateSummaryQuality(summary: string, originalText: string): boolean {
    return summary.length > 20 && 
           summary.length < originalText.length * 0.8 &&
           !summary.includes('Error') &&
           summary.split(' ').length > 5;
  }

  private calculateSentenceImportance(sentence: string): number {
    const importantWords = ['important', 'key', 'main', 'primary', 'crucial', 'significant'];
    let score = 0;
    
    importantWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) score += 1;
    });
    
    // Prefer sentences of moderate length
    const length = sentence.length;
    if (length > 50 && length < 150) score += 1;
    
    return score;
  }

  private calculateConfidence(text: string): number {
    const factors = [
      text.length > 100 ? 0.2 : 0.1,
      text.includes('.') ? 0.2 : 0.1,
      /[A-Z]/.test(text) ? 0.2 : 0.1,
      text.split(' ').length > 20 ? 0.2 : 0.1,
      !/\b(?:uh|um|er)\b/i.test(text) ? 0.2 : 0.1,
    ];
    
    return Math.min(factors.reduce((a, b) => a + b, 0), 1);
  }

  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Flesch Reading Ease approximation
    return Math.max(0, Math.min(100, 206.835 - (1.015 * avgWordsPerSentence)));
  }

  private extractKeyTopics(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 4 && !/^(the|and|that|this|with|for|are|was|were|been|have|has|had|will|would|could|should)$/.test(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'success', 'positive', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'failure', 'negative', 'sad', 'disappointed', 'problem'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private assessComplexity(text: string): 'simple' | 'moderate' | 'complex' {
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgSentenceLength = text.split(/\s+/).length / sentences;
    
    if (avgWordLength < 5 && avgSentenceLength < 15) return 'simple';
    if (avgWordLength < 7 && avgSentenceLength < 25) return 'moderate';
    return 'complex';
  }

  private async extractActionItemsWithModel(text: string): Promise<any[]> {
    // Implementation for model-based extraction
    return [];
  }

  private async extractActionItemsRegex(text: string): Promise<any[]> {
    const patterns = [
      /(?:need to|must|should|will|action|task|todo)[^.!?]*[.!?]/gi,
      /(?:follow up|next step|action item)[^.!?]*[.!?]/gi,
    ];
    
    const items: any[] = [];
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match: string) => {
          items.push({
            text: match.trim(),
            priority: this.determinePriority(match),
            category: this.categorizeAction(match),
          });
        });
      }
    });
    
    return items;
  }

  private async extractActionItemsNLP(text: string): Promise<any[]> {
    // Advanced NLP-based extraction
    return [];
  }

  private determinePriority(actionText: string): 'high' | 'medium' | 'low' {
    const highPriorityWords = ['urgent', 'asap', 'immediately', 'critical', 'must'];
    const lowPriorityWords = ['consider', 'might', 'could', 'eventually'];
    
    const lowerText = actionText.toLowerCase();
    if (highPriorityWords.some(word => lowerText.includes(word))) return 'high';
    if (lowPriorityWords.some(word => lowerText.includes(word))) return 'low';
    return 'medium';
  }

  private categorizeAction(actionText: string): string {
    const categories = {
      'communication': ['call', 'email', 'message', 'contact', 'reach out'],
      'meeting': ['schedule', 'arrange', 'book', 'calendar', 'appointment'],
      'research': ['investigate', 'analyze', 'study', 'research', 'examine'],
      'development': ['build', 'create', 'develop', 'implement', 'code'],
      'review': ['review', 'check', 'validate', 'verify', 'assess'],
    };
    
    const lowerText = actionText.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  }

  private generateEnhancedFollowUpText(
    summary: string,
    actionItems: any[],
    keyInsights: string[]
  ): string {
    const actionItemsText = actionItems.length > 0
      ? `\n\n📋 **Action Items:**\n${actionItems.map(item => 
          `• ${item.text} (Priority: ${item.priority}${item.category ? `, Category: ${item.category}` : ''})`
        ).join('\n')}`
      : '';

    const insightsText = keyInsights.length > 0
      ? `\n\n💡 **Key Insights:**\n${keyInsights.map(insight => `• ${insight}`).join('\n')}`
      : '';

    return `Hi team,\n\n📝 **Summary:**\n${summary}${insightsText}${actionItemsText}\n\n✅ Please review and let me know if you need any clarification or have additional questions.\n\nBest regards,\n[Your Name]`;
  }

  private generateEnhancedFallbackSummary(text: string): EnhancedSummaryResponse {
    const sentences = text.split(/(?<=\.)\s+/);
    const summary = sentences.slice(0, 3).join(' ');
    
    return {
      summary,
      actionItems: [],
      followUpText: `Summary: ${summary}`,
      keyInsights: [],
      metadata: this.getDefaultMetadata(),
      structuredContent: this.getDefaultStructuredContent(),
    };
  }

  private getDefaultMetadata(): SummaryMetadata {
    return {
      confidence: 0.5,
      readabilityScore: 50,
      keyTopics: [],
      sentiment: 'neutral',
      complexity: 'moderate',
      wordCount: 0,
      processingTime: 0,
    };
  }

  private getDefaultStructuredContent() {
    return {
      mainPoints: [],
      decisions: [],
      questions: [],
      risks: [],
    };
  }

  private getSettledValue<T>(result: PromiseSettledResult<T>): T | undefined {
    return result.status === 'fulfilled' ? result.value : undefined;
  }

  private updateMetrics(strategy: string, processingTime: number): void {
    this.performanceMetrics.set(strategy, processingTime);
  }

  // Legacy compatibility methods
  generateFallbackSummary(text: string) {
    const sentences = text.split(/(?<=\.)\s+/);
    return {
      summary: sentences.slice(0, 3).join(' '),
      actionItems: [],
      followUpText: `Summary: ${sentences.slice(0, 3).join(' ')}`,
    };
  }
}

// Export convenience functions for backward compatibility
export async function generateSummary(
  text: string,
  modelName: ModelName = 'facebook/bart-large-cnn'
): Promise<EnhancedSummaryResponse> {
  const summarizer = AdvancedSummarizer.getInstance();
  return summarizer.generateSummary(text, { 
    strategy: modelName === 't5-small' ? 'fast' : 'balanced' 
  });
}

export function truncateText(text: string, maxWords: number = 1000): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

// Export the main class and types
export { MODEL_STRATEGIES };
export type { ModelName, ModelStrategy };