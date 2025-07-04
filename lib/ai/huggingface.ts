import { z } from 'zod';

// =============================================
// COMPREHENSIVE SCHEMAS AND TYPES
// =============================================

// Enhanced schemas for all HuggingFace task types
const textGenerationSchema = z.object({
  generated_text: z.string(),
});

const summarizationSchema = z.object({
  summary_text: z.string(),
});

const questionAnsweringSchema = z.object({
  answer: z.string(),
  score: z.number(),
  start: z.number().optional(),
  end: z.number().optional(),
});

const sentimentAnalysisSchema = z.object({
  label: z.string(),
  score: z.number(),
});

const tokenClassificationSchema = z.object({
  entity: z.string(),
  score: z.number(),
  word: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
});

const translationSchema = z.object({
  translation_text: z.string(),
});

const textToImageSchema = z.instanceof(Blob);

const imageClassificationSchema = z.object({
  label: z.string(),
  score: z.number(),
});

const objectDetectionSchema = z.object({
  label: z.string(),
  score: z.number(),
  box: z.object({
    xmin: z.number(),
    ymin: z.number(),
    xmax: z.number(),
    ymax: z.number(),
  }),
});

const conversationalSchema = z.object({
  generated_text: z.string(),
  conversation: z.object({
    past_user_inputs: z.array(z.string()),
    generated_responses: z.array(z.string()),
  }),
});

const embeddingSchema = z.array(z.number());

const featureExtractionSchema = z.array(z.array(z.number()));

// Union schema for all possible responses
const huggingFaceResponseSchema = z.union([
  z.array(textGenerationSchema),
  z.array(summarizationSchema),
  z.array(questionAnsweringSchema),
  z.array(sentimentAnalysisSchema),
  z.array(tokenClassificationSchema),
  z.array(translationSchema),
  z.array(imageClassificationSchema),
  z.array(objectDetectionSchema),
  textGenerationSchema,
  summarizationSchema,
  questionAnsweringSchema,
  sentimentAnalysisSchema,
  tokenClassificationSchema,
  translationSchema,
  conversationalSchema,
  embeddingSchema,
  featureExtractionSchema,
  textToImageSchema,
  z.array(z.unknown()),
  z.unknown(),
]);

type HuggingFaceResponse = z.infer<typeof huggingFaceResponseSchema>;

// =============================================
// TASK-SPECIFIC INTERFACES
// =============================================

export interface TextGenerationParams {
  max_length?: number;
  min_length?: number;
  do_sample?: boolean;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  repetition_penalty?: number;
  num_return_sequences?: number;
  pad_token_id?: number;
  eos_token_id?: number;
  use_cache?: boolean;
  wait_for_model?: boolean;
}

export interface SummarizationParams {
  max_length?: number;
  min_length?: number;
  do_sample?: boolean;
  early_stopping?: boolean;
  num_beams?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  repetition_penalty?: number;
  length_penalty?: number;
  no_repeat_ngram_size?: number;
}

export interface QuestionAnsweringParams {
  context: string;
  question: string;
  max_answer_len?: number;
  max_question_len?: number;
  max_seq_len?: number;
  doc_stride?: number;
  top_k?: number;
}

export interface ConversationalParams {
  past_user_inputs?: string[];
  generated_responses?: string[];
  text: string;
  max_length?: number;
  min_length?: number;
  do_sample?: boolean;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  repetition_penalty?: number;
  pad_token_id?: number;
}

export interface TranslationParams {
  src_lang?: string;
  tgt_lang?: string;
  max_length?: number;
  min_length?: number;
  do_sample?: boolean;
  early_stopping?: boolean;
  num_beams?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
}

export interface TextToImageParams {
  negative_prompt?: string;
  height?: number;
  width?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_images_per_prompt?: number;
  eta?: number;
  generator?: number;
  latents?: number[];
  prompt_embeds?: number[];
  negative_prompt_embeds?: number[];
  output_type?: 'pil' | 'np' | 'pt';
  return_dict?: boolean;
  callback?: Function;
  callback_steps?: number;
  cross_attention_kwargs?: Record<string, any>;
}

// =============================================
// ENHANCED CONFIGURATION
// =============================================

export interface ModelConfig {
  task: string;
  maxLength: number;
  minLength: number;
  defaultParams: Record<string, any>;
  supportsStreaming: boolean;
  inputType: 'text' | 'image' | 'audio' | 'multimodal';
  outputType: 'text' | 'image' | 'audio' | 'json' | 'embedding';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Text Generation Models
  'gpt2': {
    task: 'text-generation',
    maxLength: 1024,
    minLength: 10,
    defaultParams: { temperature: 0.7, max_length: 100 },
    supportsStreaming: true,
    inputType: 'text',
    outputType: 'text',
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
  },
  'microsoft/DialoGPT-large': {
    task: 'conversational',
    maxLength: 1000,
    minLength: 1,
    defaultParams: { temperature: 0.7, max_length: 100 },
    supportsStreaming: true,
    inputType: 'text',
    outputType: 'text',
    rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
  },
  
  // Summarization Models
  'facebook/bart-large-cnn': {
    task: 'summarization',
    maxLength: 1024,
    minLength: 50,
    defaultParams: { max_length: 150, min_length: 30, do_sample: false },
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'text',
    rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
  },
  'google/pegasus-xsum': {
    task: 'summarization',
    maxLength: 512,
    minLength: 20,
    defaultParams: { max_length: 64, min_length: 10, do_sample: false },
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'text',
    rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
  },
  
  // Question Answering Models
  'deepset/roberta-base-squad2': {
    task: 'question-answering',
    maxLength: 512,
    minLength: 1,
    defaultParams: { max_answer_len: 15 },
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'json',
    rateLimit: { requestsPerMinute: 200, requestsPerHour: 5000 },
  },
  
  // Sentiment Analysis Models
  'cardiffnlp/twitter-roberta-base-sentiment-latest': {
    task: 'sentiment-analysis',
    maxLength: 512,
    minLength: 1,
    defaultParams: {},
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'json',
    rateLimit: { requestsPerMinute: 300, requestsPerHour: 10000 },
  },
  
  // Translation Models
  'Helsinki-NLP/opus-mt-en-de': {
    task: 'translation',
    maxLength: 512,
    minLength: 1,
    defaultParams: { max_length: 400 },
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'text',
    rateLimit: { requestsPerMinute: 200, requestsPerHour: 5000 },
  },
  
  // Text-to-Image Models
  'runwayml/stable-diffusion-v1-5': {
    task: 'text-to-image',
    maxLength: 77,
    minLength: 1,
    defaultParams: { num_inference_steps: 50, guidance_scale: 7.5 },
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'image',
    rateLimit: { requestsPerMinute: 10, requestsPerHour: 100 },
  },
  
  // Embedding Models
  'sentence-transformers/all-MiniLM-L6-v2': {
    task: 'feature-extraction',
    maxLength: 256,
    minLength: 1,
    defaultParams: {},
    supportsStreaming: false,
    inputType: 'text',
    outputType: 'embedding',
    rateLimit: { requestsPerMinute: 500, requestsPerHour: 10000 },
  },
  
  // Image Classification Models
  'google/vit-base-patch16-224': {
    task: 'image-classification',
    maxLength: 224,
    minLength: 224,
    defaultParams: {},
    supportsStreaming: false,
    inputType: 'image',
    outputType: 'json',
    rateLimit: { requestsPerMinute: 200, requestsPerHour: 5000 },
  },
};

// =============================================
// ENHANCED OPTIONS AND INTERFACES
// =============================================

export interface HuggingFaceOptions {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  useCache?: boolean;
  waitForModel?: boolean;
  validateInput?: boolean;
  validateOutput?: boolean;
  rateLimitEnabled?: boolean;
  requestId?: string;
  priority?: 'low' | 'normal' | 'high';
  streaming?: boolean;
  batchSize?: number;
  onProgress?: (progress: { loaded: number; total: number }) => void;
  onError?: (error: Error, attempt: number) => void;
  onRetry?: (attempt: number, delay: number) => void;
  onSuccess?: (response: any, duration: number) => void;
}

export interface HuggingFaceError extends Error {
  code: string;
  status?: number;
  response?: any;
  retryable: boolean;
}

export interface RequestMetrics {
  requestId: string;
  model: string;
  task: string;
  duration: number;
  retries: number;
  success: boolean;
  inputSize: number;
  outputSize: number;
  timestamp: Date;
}

// =============================================
// RATE LIMITING AND CACHING
// =============================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(key: string, config: ModelConfig): boolean {
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const now = Date.now();
    const requests = this.requests.get(key)!;
    
    // Clean old requests
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    this.requests.set(key, requests.filter(time => time > oneHourAgo));
    
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    
    return recentRequests.length < config.rateLimit.requestsPerMinute &&
           requests.length < config.rateLimit.requestsPerHour;
  }
  
  recordRequest(key: string): void {
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key)!.push(Date.now());
  }
}

class ResponseCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// =============================================
// MAIN HUGGINGFACE CLIENT CLASS
// =============================================

export class HuggingFaceClient {
  private apiKey: string | null = null;
  private rateLimiter = new RateLimiter();
  private cache = new ResponseCache();
  private metrics: RequestMetrics[] = [];
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || null;
  }
  
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  getMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }
  
  clearMetrics(): void {
    this.metrics = [];
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  private createError(message: string, code: string, status?: number, response?: any): HuggingFaceError {
    const error = new Error(message) as HuggingFaceError;
    error.code = code;
    error.status = status;
    error.response = response;
    error.retryable = status ? status >= 500 || status === 429 : true;
    return error;
  }
  
  private validateInput(model: string, inputs: any): void {
    const config = MODEL_CONFIGS[model];
    if (!config) {
      throw this.createError(`Unknown model: ${model}`, 'UNKNOWN_MODEL');
    }
    
    if (config.inputType === 'text' && typeof inputs !== 'string') {
      throw this.createError('Input must be a string for text models', 'INVALID_INPUT_TYPE');
    }
    
    if (config.inputType === 'text' && inputs.length > config.maxLength) {
      throw this.createError(`Input exceeds maximum length of ${config.maxLength}`, 'INPUT_TOO_LONG');
    }
  }
  
  private getCacheKey(model: string, inputs: any, parameters: any): string {
    return `${model}:${JSON.stringify(inputs)}:${JSON.stringify(parameters)}`;
  }
  
  async call<T = any>(
    model: string,
    inputs: string | Record<string, any> | Blob,
    parameters: Record<string, any> = {},
    options: HuggingFaceOptions = {}
  ): Promise<T> {
    const requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // Get model configuration
      const config = MODEL_CONFIGS[model] || MODEL_CONFIGS['gpt2'];
      
      // Validate input if enabled
      if (options.validateInput !== false) {
        this.validateInput(model, inputs);
      }
      
      // Check rate limiting
      if (options.rateLimitEnabled !== false) {
        const rateLimitKey = this.apiKey ? `${this.apiKey}:${model}` : `anonymous:${model}`;
        if (!this.rateLimiter.canMakeRequest(rateLimitKey, config)) {
          throw this.createError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
        }
      }
      
      // Check cache
      const cacheKey = this.getCacheKey(model, inputs, parameters);
      if (options.useCache !== false) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached as T;
        }
      }
      
      // Merge parameters with defaults
      const finalParameters = { ...config.defaultParams, ...parameters };
      
      // Make the API call
      const response = await this.makeRequest(model, inputs, finalParameters, options);
      
      // Record rate limit usage
      if (options.rateLimitEnabled !== false) {
        const rateLimitKey = this.apiKey ? `${this.apiKey}:${model}` : `anonymous:${model}`;
        this.rateLimiter.recordRequest(rateLimitKey);
      }
      
      // Cache the response
      if (options.useCache !== false) {
        this.cache.set(cacheKey, response);
      }
      
      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.push({
        requestId,
        model,
        task: config.task,
        duration,
        retries: 0,
        success: true,
        inputSize: JSON.stringify(inputs).length,
        outputSize: JSON.stringify(response).length,
        timestamp: new Date(),
      });
      
      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(response, duration);
      }
      
      return response as T;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.push({
        requestId,
        model,
        task: MODEL_CONFIGS[model]?.task || 'unknown',
        duration,
        retries: 0,
        success: false,
        inputSize: JSON.stringify(inputs).length,
        outputSize: 0,
        timestamp: new Date(),
      });
      
      if (options.onError) {
        options.onError(error as Error, 0);
      }
      
      throw error;
    }
  }
  
  private async makeRequest(
    model: string,
    inputs: any,
    parameters: Record<string, any>,
    options: HuggingFaceOptions
  ): Promise<any> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 60000,
      waitForModel = true,
      priority = 'normal',
    } = options;
    
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': options.requestId || `req_${Date.now()}`,
      'X-Priority': priority,
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const body = inputs instanceof Blob ? inputs : JSON.stringify({
          inputs,
          parameters,
          options: {
            wait_for_model: waitForModel,
            use_cache: options.useCache,
          },
        });
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases
          if (response.status === 503 && errorData.error?.includes('loading')) {
            if (attempt < maxRetries) {
              const delay = Math.min(retryDelay * Math.pow(2, attempt), 30000);
              if (options.onRetry) {
                options.onRetry(attempt + 1, delay);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          throw this.createError(
            `API request failed: ${errorData.error || response.statusText}`,
            'API_ERROR',
            response.status,
            errorData
          );
        }
        
        // Handle different response types
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('image/')) {
          data = await response.blob();
        } else {
          data = await response.text();
        }
        
        // Validate output if enabled
        if (options.validateOutput !== false) {
          try {
            huggingFaceResponseSchema.parse(data);
          } catch (validationError) {
            console.warn('Response validation failed:', validationError);
          }
        }
        
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (except 429)
        if (error instanceof Error && error.message.includes('status 4') && !error.message.includes('429')) {
          break;
        }
        
        // Exponential backoff with jitter
        if (attempt < maxRetries) {
          const baseDelay = retryDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 0.1 * baseDelay;
          const delay = Math.min(baseDelay + jitter, 30000);
          
          if (options.onRetry) {
            options.onRetry(attempt + 1, delay);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } finally {
        clearTimeout(timeoutId);
      }
    }
    
    throw lastError || this.createError('Failed to call HuggingFace API after retries', 'MAX_RETRIES_EXCEEDED');
  }
}

// =============================================
// CONVENIENCE FUNCTIONS
// =============================================

// Global client instance
let globalClient: HuggingFaceClient | null = null;

export function getClient(apiKey?: string): HuggingFaceClient {
  if (!globalClient) {
    globalClient = new HuggingFaceClient(apiKey);
  } else if (apiKey) {
    globalClient.setApiKey(apiKey);
  }
  return globalClient;
}

export async function callHuggingFace<T = any>(
  model: string,
  inputs: string | Record<string, any> | Blob,
  parameters: Record<string, any> = {},
  options: HuggingFaceOptions = {}
): Promise<T> {
  const client = getClient();
  return client.call<T>(model, inputs, parameters, options);
}

export function parseHuggingFaceResponse(response: unknown): string {
  try {
    const result = huggingFaceResponseSchema.parse(response);
    
    // Handle array responses
    if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        if ('summary_text' in firstItem) return (firstItem as { summary_text: string }).summary_text;
        if ('generated_text' in firstItem) return (firstItem as { generated_text: string }).generated_text;
        if ('translation_text' in firstItem) return (firstItem as { translation_text: string }).translation_text;
        if ('answer' in firstItem) return (firstItem as { answer: string }).answer;
        if ('label' in firstItem) {
          const item = firstItem as { label: string; score: number };
          return `${item.label} (${item.score.toFixed(3)})`;
        }
      }
    }
    
    // Handle single object responses
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      if ('summary_text' in result) return (result as { summary_text: string }).summary_text;
      if ('generated_text' in result) return (result as { generated_text: string }).generated_text;
      if ('translation_text' in result) return (result as { translation_text: string }).translation_text;
      if ('answer' in result) return (result as { answer: string }).answer;
      if ('label' in result) {
        const res = result as { label: string; score: number };
        return `${res.label} (${res.score.toFixed(3)})`;
      }
    }
    
    // Handle embeddings and feature extraction
    if (Array.isArray(result) && typeof result[0] === 'number') {
      return `Embedding vector of length ${result.length}`;
    }
    
    return JSON.stringify(result);
    
  } catch (error) {
    console.error('Failed to parse HuggingFace response:', error);
    return String(response);
  }
}

export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS['gpt2'];
}

export function listAvailableModels(): string[] {
  return Object.keys(MODEL_CONFIGS);
}

export function getModelsByTask(task: string): string[] {
  return Object.entries(MODEL_CONFIGS)
    .filter(([_, config]) => config.task === task)
    .map(([model, _]) => model);
}

// =============================================
// TASK-SPECIFIC HELPER FUNCTIONS
// =============================================

export async function generateText(
  model: string,
  prompt: string,
  params: TextGenerationParams = {},
  options: HuggingFaceOptions = {}
): Promise<string> {
  const response = await callHuggingFace(model, prompt, params, options);
  return parseHuggingFaceResponse(response);
}

export async function summarizeText(
  model: string,
  text: string,
  params: SummarizationParams = {},
  options: HuggingFaceOptions = {}
): Promise<string> {
  const response = await callHuggingFace(model, text, params, options);
  return parseHuggingFaceResponse(response);
}

export async function answerQuestion(
  model: string,
  question: string,
  context: string,
  params: Partial<QuestionAnsweringParams> = {},
  options: HuggingFaceOptions = {}
): Promise<string> {
  const response = await callHuggingFace(model, { question, context }, params, options);
  return parseHuggingFaceResponse(response);
}

export async function translateText(
  model: string,
  text: string,
  params: TranslationParams = {},
  options: HuggingFaceOptions = {}
): Promise<string> {
  const response = await callHuggingFace(model, text, params, options);
  return parseHuggingFaceResponse(response);
}

export async function analyzesentiment(
  model: string,
  text: string,
  options: HuggingFaceOptions = {}
): Promise<string> {
  const response = await callHuggingFace(model, text, {}, options);
  return parseHuggingFaceResponse(response);
}

export async function generateImage(
  model: string,
  prompt: string,
  params: TextToImageParams = {},
  options: HuggingFaceOptions = {}
): Promise<Blob> {
  const response = await callHuggingFace(model, prompt, params, options);
  return response as Blob;
}

export async function getEmbeddings(
  model: string,
  text: string,
  options: HuggingFaceOptions = {}
): Promise<number[]> {
  const response = await callHuggingFace(model, text, {}, options);
  return response as number[];
}

export async function batchProcess<T>(
  model: string,
  inputs: any[],
  parameters: Record<string, any> = {},
  options: HuggingFaceOptions = {}
): Promise<T[]> {
  const batchSize = options.batchSize || 10;
  const results: T[] = [];
  
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchPromises = batch.map(input => 
      callHuggingFace<T>(model, input, parameters, options)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < inputs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// =============================================
// EXPORTS
// =============================================

export type { HuggingFaceResponse };