// app/demo-preview/page.tsx

import React from 'react';
import LiveTranscribe from '@/components/LiveTranscribe';

export default function DemoPreviewPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Live Transcription Demo</h1>
        <LiveTranscribe />
        <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
          <p>Click 'Start Recording' and speak into your microphone. The transcription will appear in real-time.</p>
          <p>(Note: You may need to grant microphone permissions to your browser.)</p>
        </div>
      </div>
    </div>
  );
}
