import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import pdf from 'pdf-parse';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_TOKEN);

// Define the expected structure for the AI's response
interface AnalysisResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{ task: string; assignee?: string; dueDate?: string }>;
}

export async function POST(request: Request) {
  try {
    const { fileKey } = await request.json();

    if (!fileKey) {
      return NextResponse.json({ error: 'No file key provided' }, { status: 400 });
    }

    if (!process.env.HF_TOKEN) {
        return NextResponse.json({ error: 'Hugging Face API token not configured' }, { status: 500 });
    }

    // 1. Fetch the file from UploadThing
    const fileUrl = `https://utfs.io/f/${fileKey}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const fileBuffer = await response.arrayBuffer();

    // 2. Extract text from the PDF
    const pdfData = await pdf(fileBuffer);
    const textContent = pdfData.text;

    if (!textContent) {
        return NextResponse.json({ error: 'Could not extract text from PDF.' }, { status: 500 });
    }

    // 3. Create a prompt for the AI
    const prompt = `
      [INST] You are an expert document analyst. Analyze the following text content and return ONLY a valid, raw JSON object with the structure: { "title": "string", "summary": "string", "keyPoints": ["string"], "actionItems": [{ "task": "string", "assignee": "string", "dueDate": "string" }] }.

      - If the document is a resume, the title should be the person's name, summary a professional summary, keyPoints top skills/achievements, and actionItems empty.
      - If it's a meeting, title is the subject, summary is a discussion brief, keyPoints are decisions, and actionItems are assigned tasks.
      - For other documents, create a suitable title, summary, and key points. Action items may be empty.
      - Your response MUST be a valid JSON object and nothing else. Do not include any explanatory text or markdown formatting.

      Text to analyze:
      ---
      ${textContent.substring(0, 4000)}
      --- [/INST]
    `;

    // 4. Call Hugging Face API
    const hfResponse = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        return_full_text: false,
      }
    });

    const result = hfResponse.generated_text;

    if (!result) {
        throw new Error('Hugging Face model failed to generate a response.');
    }

    // 5. Parse and return the result
    const analysisResult: AnalysisResult = JSON.parse(result);
    
    // Add a default date and duration for compatibility with the old structure
    const finalResult = {
        ...analysisResult,
        id: fileKey,
        date: new Date().toLocaleDateString(),
        duration: 'N/A',
        participants: analysisResult.actionItems.map(item => item.assignee).filter(Boolean) as string[],
    };

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('Error in summarize API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to analyze document', details: errorMessage }, { status: 500 });
  }
}
