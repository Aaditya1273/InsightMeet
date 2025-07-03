// app/api/share/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    // Encode the text to be URL-safe
    const encodedText = Buffer.from(text).toString('base64url');

    // Construct the shareable URL
    const url = new URL(req.nextUrl);
    const shareUrl = `${url.origin}/results?summary=${encodedText}`;

    return NextResponse.json({ shareUrl });
  } catch (error) {
    console.error('Error sharing summary:', error);
    return NextResponse.json({ message: 'Failed to share summary.', error: (error as Error).message }, { status: 500 });
  }
}