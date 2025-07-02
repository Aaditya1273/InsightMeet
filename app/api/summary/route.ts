import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSummary, type SummaryResponse, truncateText } from '@/lib/ai/summarize';
import { z } from 'zod';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Input validation schema
const summaryRequestSchema = z.object({
  content: z.string().min(50, 'Content must be at least 50 characters'),
  title: z.string().optional(),
  participants: z.array(z.string().email()).optional(),
  duration: z.string().optional(),
});

type SummaryRequest = z.infer<typeof summaryRequestSchema>;

// Cache for storing recent summaries
const summaryCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of summaryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      summaryCache.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanCache, 60 * 1000);

export async function POST(request: Request) {
  try {
    const requestData: unknown = await request.json();
    
    // Validate input
    const validation = summaryRequestSchema.safeParse(requestData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { content, title, participants = [], duration } = validation.data;
    
    // Check cache first
    const cacheKey = `${content.substring(0, 100)}`; // Simple cache key based on content start
    const cached = summaryCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    // Truncate content to avoid hitting token limits
    const truncatedContent = truncateText(content);
    
    // Generate summary using AI
    const summaryData = await generateSummary(truncatedContent);
    
    // Prepare the full summary object
    const fullSummary = {
      title: title || 'Meeting Summary',
      date: new Date().toISOString(),
      duration: duration || 'Unknown',
      participants,
      summary: summaryData.summary,
      keyPoints: summaryData.actionItems,
      actionItems: summaryData.actionItems.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        task: item,
        assignee: '',
        dueDate: '',
        completed: false,
      })),
      followUpText: summaryData.followUpText,
    };

    // Store in cache
    summaryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: fullSummary,
    });

    // Store in Supabase if configured
    if (supabaseUrl && supabaseKey) {
      try {
        await supabase
          .from('summaries')
          .insert([
            { 
              content: truncatedContent,
              summary: fullSummary,
              created_at: new Date().toISOString(),
              metadata: {
                model: 'facebook/bart-large-cnn',
                length: content.length,
                truncated: content.length > truncatedContent.length,
              }
            },
          ]);
      } catch (dbError) {
        console.error('Error saving to database (non-fatal):', dbError);
        // Continue even if database save fails
      }
    }

    return NextResponse.json(fullSummary);
  } catch (error) {
    console.error('Error in summary generation:', error);
    
    // Fallback response if AI service is down
    if (error instanceof Error && error.message.includes('API request failed')) {
      return NextResponse.json(
        { 
          error: 'AI service is temporarily unavailable',
          fallback: true,
          message: 'Using simplified summary generation',
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Add CORS headers for cross-origin requests
export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
