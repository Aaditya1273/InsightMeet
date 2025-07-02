import { generateSummary } from '../lib/ai/summarize';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  try {
    // Read test transcript
    const testFilePath = path.join(__dirname, '..', 'test', 'fixtures', 'meeting-transcript.txt');
    const transcript = await fs.readFile(testFilePath, 'utf-8');
    
    console.log('Generating summary...');
    const startTime = Date.now();
    
    const result = await generateSummary(transcript);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n=== SUMMARY ===');
    console.log(result.summary);
    
    console.log('\n=== ACTION ITEMS ===');
    result.actionItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item}`);
    });
    
    console.log('\n=== FOLLOW-UP TEXT ===');
    console.log(result.followUpText);
    
    console.log(`\nGenerated in ${duration.toFixed(2)} seconds`);
    
    // Save results
    const outputDir = path.join(__dirname, '..', 'test', 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `summary-${timestamp}.json`);
    
    await fs.writeFile(
      outputFile,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    
    console.log(`\nResults saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('Error generating summary:', error);
    process.exit(1);
  }
}

// Run the test
main();
