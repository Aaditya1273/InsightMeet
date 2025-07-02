import { z } from 'zod';

// Schema for HuggingFace API response
const huggingFaceResponseSchema = z.union([
  z.object({
    summary_text: z.string(),
  }),
  z.object({
    generated_text: z.string(),
  }),
  z.array(
    z.object({
      summary_text: z.string(),
    })
  ),
  z.array(
    z.object({
      generated_text: z.string(),
    })
  ),
]);

type HuggingFaceResponse = z.infer<typeof huggingFaceResponseSchema>;

/**
 * Call HuggingFace inference API with retry logic
 */
export async function callHuggingFace<T = any>(
  model: string,
  inputs: string | Record<string, any>,
  parameters: Record<string, any> = {},
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000, // 1 second
    timeout = 30000, // 30 seconds
  } = options;

  const url = `https://api-inference.huggingface.co/models/${model}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs,
          parameters,
          options: {
            wait_for_model: true,
          },
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API request failed with status ${response.status}: ${JSON.stringify(errorData)}`
        );
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 429 - Too Many Requests)
      if (
        error instanceof Error &&
        error.message.includes('status 4') &&
        !error.message.includes('status 429')
      ) {
        break;
      }
      
      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  throw lastError || new Error('Failed to call HuggingFace API');
}

/**
 * Parse HuggingFace response to extract the generated text
 */
export function parseHuggingFaceResponse(response: unknown): string {
  try {
    const result = huggingFaceResponseSchema.parse(response);
    
    if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0];
      if ('summary_text' in firstItem) {
        return firstItem.summary_text;
      }
      if ('generated_text' in firstItem) {
        return firstItem.generated_text;
      }
    }
    
    if (!Array.isArray(result)) {
      if ('summary_text' in result) {
        return result.summary_text;
      }
      if ('generated_text' in result) {
        return result.generated_text;
      }
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('Failed to parse HuggingFace response:', error);
    throw new Error('Failed to parse model response');
  }
}

/**
 * Get model configuration
 */
export function getModelConfig(modelName: string) {
  const models: Record<string, { maxLength: number; minLength: number }> = {
    'facebook/bart-large-cnn': {
      maxLength: 1024,
      minLength: 100,
    },
    'google/pegasus-xsum': {
      maxLength: 512,
      minLength: 50,
    },
    't5-small': {
      maxLength: 512,
      minLength: 100,
    },
  };
  
  return models[modelName] || models['facebook/bart-large-cnn'];
}
