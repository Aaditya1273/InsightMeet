import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { HfInference } from '@huggingface/inference';
import pdfParse from 'pdf-parse';
import { generateDocuments } from '@/lib/utils/document-utils';

interface AnalysisResult {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    completed: boolean;
  }>;
  confidence: number;
  wordCount: number;
  documentType: string;
}

// In-memory cache for processed documents
const analysisCache = new Map<string, AnalysisResult>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Enhanced models for better performance
const MODELS = {
  primary: 'mistralai/Mistral-7B-Instruct-v0.2',
  fallback: 'microsoft/DialoGPT-medium',
  fast: 'facebook/bart-large-cnn'
};

const hf = new HfInference(process.env.HF_TOKEN ?? '');

// Text preprocessing utilities
function preprocessText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?;:()\-]/g, '') // Remove special characters
    .trim();
}

function detectDocumentType(text: string): 'resume' | 'meeting' | 'report' | 'contract' | 'other' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('resume') || lowerText.includes('cv') || 
      (lowerText.includes('experience') && lowerText.includes('education'))) {
    return 'resume';
  }
  
  if (lowerText.includes('meeting') || lowerText.includes('agenda') || 
      lowerText.includes('attendees') || lowerText.includes('minutes')) {
    return 'meeting';
  }
  
  if (lowerText.includes('report') || lowerText.includes('analysis') || 
      lowerText.includes('findings')) {
    return 'report';
  }
  
  if (lowerText.includes('agreement') || lowerText.includes('contract') || 
      lowerText.includes('terms and conditions')) {
    return 'contract';
  }
  
  return 'other';
}

function createOptimizedPrompt(text: string, docType: string): string {
  const basePrompt = `[INST] You are an expert document analyst with 15+ years of experience. Analyze the following ${docType} document and extract key information with high accuracy.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object - no explanatory text, markdown, or formatting
2. Be precise and factual - avoid speculation
3. Extract specific, actionable information
4. Maintain professional tone throughout

Required JSON structure:
{
  "title": "string (concise, descriptive title)",
  "summary": "string (2-3 sentences, key essence)",
  "keyPoints": ["string array (3-7 most important points)"],
  "actionItems": [{
    "task": "string (specific action)",
    "assignee": "string (person responsible or 'TBD')",
    "dueDate": "string (date or 'TBD')",
    "priority": "low|medium|high"
  }],
  "confidence": number (0-1, your confidence in analysis),
  "wordCount": number (approximate word count),
  "documentType": "${docType}"
}

DOCUMENT TYPE SPECIFIC GUIDELINES:
${getTypeSpecificGuidelines(docType)}

Document content to analyze:
---
${text}
---

Return the JSON object now: [/INST]`;

  return basePrompt;
}

function getTypeSpecificGuidelines(docType: string): string {
  switch (docType) {
    case 'resume':
      return `- Title: Person's full name
- Summary: Professional background and career level
- Key Points: Top skills, achievements, experience highlights
- Action Items: Usually empty for resumes`;
    
    case 'meeting':
      return `- Title: Meeting subject/purpose
- Summary: Main discussion points and outcomes
- Key Points: Decisions made, important discussions
- Action Items: Specific tasks assigned with owners and deadlines`;
    
    case 'report':
      return `- Title: Report subject
- Summary: Main findings and conclusions
- Key Points: Key insights, data points, recommendations
- Action Items: Recommended actions and next steps`;
    
    case 'contract':
      return `- Title: Contract type and parties involved
- Summary: Main terms and purpose
- Key Points: Key clauses, obligations, terms
- Action Items: Required actions, deadlines, deliverables`;
    
    default:
      return `- Title: Document subject
- Summary: Main content and purpose
- Key Points: Most important information
- Action Items: Any actionable items mentioned`;
  }
}

async function callHuggingFaceWithRetry(prompt: string, maxRetries = 3): Promise<string> {
  const models = [MODELS.primary, MODELS.fallback];
  
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await hf.textGeneration({
          model,
          inputs: prompt,
          parameters: {
            max_new_tokens: 1536,
            temperature: 0.3, // Lower temperature for more consistent results
            top_p: 0.95,
            repetition_penalty: 1.1,
            return_full_text: false,
            do_sample: true
          }
        });

        if (response.generated_text) {
          return response.generated_text.trim();
        }
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for model ${model}:`, error);
        
        if (attempt === maxRetries - 1 && modelIndex === models.length - 1) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new Error('All models and retries failed');
}

function validateAndEnhanceResult(result: any, originalText: string): AnalysisResult {
  const id = createHash('md5').update(originalText).digest('hex').substring(0, 8);
  const now = new Date().toISOString();
  
  // Ensure all required fields exist with defaults
  const enhanced: AnalysisResult = {
    id,
    title: result.title || 'Untitled Document',
    date: now,
    duration: result.duration || 'N/A',
    participants: result.participants || [],
    summary: result.summary || 'No summary available',
    keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
    actionItems: Array.isArray(result.actionItems) 
      ? result.actionItems.map((item: any, index: number) => ({
          id: `action_${index + 1}`,
          task: item.task || 'Undefined task',
          assignee: item.assignee || 'TBD',
          dueDate: item.dueDate || 'TBD',
          priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
          completed: Boolean(item.completed)
        }))
      : [],
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
    wordCount: result.wordCount || Math.ceil(originalText.split(/\s+/).length),
    documentType: result.documentType || 'other'
  };
  
  return enhanced;
}

function cleanJsonResponse(text: string): string {
  // Remove common prefixes and suffixes
  let cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Find JSON object boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  return cleaned.trim();
}

export async function POST(req: Request) {
  try {
    const { fileKey } = await req.json();
    
    // Check cache first
    const cacheKey = createHash('md5').update(fileKey).digest('hex');
    const cachedResult = analysisCache.get(cacheKey);
    
    if (cachedResult) {
      const cachedDate = new Date(cachedResult.date).getTime();
      if (Date.now() - cachedDate < CACHE_DURATION) {
        return NextResponse.json(cachedResult);
      }
    }

    // Fetch file from UploadThing
    const response = await fetch(`${process.env.NEXT_PUBLIC_UPLOADTHING_URL}/file/${fileKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    
    if (!pdfData.text) {
      throw new Error('No text content found in PDF');
    }

    const text = preprocessText(pdfData.text);
    
    // Create optimized prompt
    const prompt = `You are an expert document analyst. Analyze the following document and extract key information.

Required JSON structure:
{
  "title": "string (concise, descriptive title)",
  "summary": "string (2-3 sentences, key essence)",
  "keyPoints": ["string array (3-7 most important points)"],
  "actionItems": [{
    "task": "string (specific action)",
    "assignee": "string (person responsible or 'TBD')",
    "dueDate": "string (date or 'TBD')",
    "completed": boolean
  }],
  "participants": ["string array of participant names"]
}

Document content:
---
${text}
---

Return only the JSON object now:`;
    
    // Call Hugging Face with retry
    const resultText = await callHuggingFaceWithRetry(prompt);
    
    // Parse and validate result
    let result: AnalysisResult;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error('Failed to parse JSON:', resultText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and enhance result
    const enhancedResult: AnalysisResult = {
      id: createHash('md5').update(text).digest('hex').substring(0, 8),
      title: result.title || 'Untitled Document',
      date: new Date().toISOString(),
      duration: result.duration || 'N/A',
      participants: result.participants || [],
      summary: result.summary || 'No summary available',
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems?.map((item: any, index: number) => ({
        id: `action_${index + 1}`,
        task: item.task || 'Undefined task',
        assignee: item.assignee || 'TBD',
        dueDate: item.dueDate || 'TBD',
        completed: Boolean(item.completed)
      })) || [],
      confidence: result.confidence || 0.8,
      wordCount: result.wordCount || text.split(/\s+/).length,
      documentType: result.documentType || detectDocumentType(text)
    };

    // Generate documents (PDF and calendar event)
    try {
      await generateDocuments(enhancedResult);
    } catch (error) {
      console.error('Error generating documents:', error);
    }

    // Update cache
    analysisCache.set(cacheKey, enhancedResult);
    
    return NextResponse.json(enhancedResult);
  } catch (error) {
    console.error('Error in summary API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}