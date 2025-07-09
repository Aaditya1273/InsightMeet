import { generateSummary } from '../lib/ai/summarize';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Worker } from 'worker_threads';
import cluster from 'cluster';
import os from 'os';

// Enhanced interfaces for better type safety
interface ActionItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
  category?: string;
}

interface SummaryResult {
  summary: string;
  actionItems: ActionItem[];
  followUpText: string;
  keyDecisions?: string[];
  participants?: string[];
  topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  processingTime?: number;
  wordCount?: number;
  metadata?: {
    fileName: string;
    fileSize: number;
    generatedAt: string;
    version: string;
  };
}

interface ProcessingOptions {
  batchSize?: number;
  concurrent?: boolean;
  maxConcurrency?: number;
  enableCache?: boolean;
  outputFormat?: 'json' | 'markdown' | 'html' | 'pdf';
  includeMetrics?: boolean;
  enableCompression?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

interface ProcessingMetrics {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  throughput: number;
  errors: Array<{ file: string; error: string; timestamp: string }>;
}

class EnhancedSummaryGenerator {
  private options: ProcessingOptions;
  private metrics: ProcessingMetrics;
  private cache: Map<string, SummaryResult>;
  private readonly VERSION = '2.0.0';

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      batchSize: 5,
      concurrent: true,
      maxConcurrency: os.cpus().length,
      enableCache: true,
      outputFormat: 'json',
      includeMetrics: true,
      enableCompression: false,
      retryAttempts: 3,
      timeout: 300000, // 5 minutes
      ...options
    };

    this.metrics = {
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      throughput: 0,
      errors: []
    };

    this.cache = new Map();
  }

  // Enhanced file discovery with pattern matching
  private async discoverFiles(inputPath: string, patterns: string[] = ['*.txt', '*.md', '*.rtf']): Promise<string[]> {
    const files: string[] = [];
    const stats = await fs.stat(inputPath);

    if (stats.isFile()) {
      return [inputPath];
    }

    if (stats.isDirectory()) {
      const entries = await fs.readdir(inputPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(inputPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.discoverFiles(fullPath, patterns);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (patterns.some(pattern => 
            pattern.replace('*', '').includes(ext) || 
            entry.name.match(new RegExp(pattern.replace('*', '.*')))
          )) {
            files.push(fullPath);
          }
        }
      }
    }

    return files;
  }

  // Enhanced file reading with encoding detection and streaming
  private async readFileContent(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // For large files, use streaming
      if (fileSize > 10 * 1024 * 1024) { // 10MB threshold
        return await this.readLargeFile(filePath);
      }

      // Auto-detect encoding for better compatibility
      const buffer = await fs.readFile(filePath);
      const encoding = this.detectEncoding(buffer);
      
      return buffer.toString(encoding as BufferEncoding);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  // Streaming reader for large files
  private async readLargeFile(filePath: string): Promise<string> {
    const chunks: (string | Buffer)[] = [];
    const readStream = createReadStream(filePath, { encoding: 'utf-8' });
    
    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk: string | Buffer) => {
        chunks.push(chunk);
      });
      readStream.on('end', () => {
        const content = chunks.map(chunk => 
          typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
        ).join('');
        resolve(content);
      });
      readStream.on('error', reject);
    });
  }

  // Basic encoding detection
  private detectEncoding(buffer: Buffer): string {
    // Check for BOM
    if (buffer.length >= 2) {
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) return 'utf16le';
      if (buffer[0] === 0xFE && buffer[1] === 0xFF) return 'utf16be';
    }
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }
    
    return 'utf8'; // Default fallback
  }

  // Enhanced summary generation with retry logic and timeout
  private async generateSummaryWithRetry(
    content: string, 
    fileName: string, 
    attempt: number = 1
  ): Promise<SummaryResult> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Summary generation timeout')), this.options.timeout);
      });

      // Generate summary with timeout
      const summaryPromise = generateSummary(content);
      const result = await Promise.race([summaryPromise, timeoutPromise]);
      
      const processingTime = Date.now() - startTime;
      
      // Enhanced result with additional metadata
      const enhancedResult: SummaryResult = {
        ...result,
        processingTime,
        wordCount: content.split(/\s+/).length,
        confidence: this.calculateConfidence(result, content),
        sentiment: this.analyzeSentiment(result.summary),
        participants: this.extractParticipants(content),
        topics: this.extractTopics(content),
        keyDecisions: this.extractDecisions(content),
        fileName,
        fileSize: Buffer.byteLength(content, 'utf8'),
        generatedAt: new Date().toISOString(),
        version: this.VERSION,
        metadata: {
          fileName,
          fileSize: Buffer.byteLength(content, 'utf8'),
          generatedAt: new Date().toISOString(),
          version: this.VERSION
        }
      };

      return enhancedResult;
    } catch (error) {
      const retryAttempts = this.options.retryAttempts ?? 3; // Provide default value if undefined
      if (attempt < retryAttempts) {
        console.warn(`Attempt ${attempt} failed for ${fileName}, retrying...`);
        await this.delay(1000 * attempt); // Exponential backoff
        return this.generateSummaryWithRetry(content, fileName, attempt + 1);
      }
      throw error;
    }
  }

  // Simple confidence calculation based on content analysis
  private calculateConfidence(result: SummaryResult, content: string): number {
    const summaryLength = result.summary.length;
    const contentLength = content.length;
    const actionItemsCount = result.actionItems.length;
    
    // Basic heuristic: longer summaries and more action items indicate higher confidence
    const lengthRatio = Math.min(summaryLength / (contentLength * 0.1), 1);
    const actionItemScore = Math.min(actionItemsCount / 5, 1);
    
    return Math.round((lengthRatio * 0.6 + actionItemScore * 0.4) * 100) / 100;
  }

  // Basic sentiment analysis
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['success', 'good', 'excellent', 'positive', 'agree', 'approved'];
    const negativeWords = ['problem', 'issue', 'concern', 'failed', 'negative', 'rejected'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Extract participants from content
  private extractParticipants(content: string): string[] {
    const participants = new Set<string>();
    
    // Common patterns for speaker identification
    const speakerPatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+):/gm,
      /^([A-Z][a-z]+):/gm,
      /\[([A-Z][a-z]+ [A-Z][a-z]+)\]/gm,
      /\(([A-Z][a-z]+ [A-Z][a-z]+)\)/gm
    ];
    
    speakerPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const name = match.replace(/[:\[\]()]/g, '').trim();
          if (name.length > 2 && name.length < 50) {
            participants.add(name);
          }
        });
      }
    });
    
    return Array.from(participants);
  }

  // Extract topics from content
  private extractTopics(content: string): string[] {
    const topics = new Set<string>();
    
    // Look for topic indicators
    const topicPatterns = [
      /agenda item[:\s]+([^\n]+)/gi,
      /topic[:\s]+([^\n]+)/gi,
      /discussion[:\s]+([^\n]+)/gi,
      /regarding[:\s]+([^\n]+)/gi
    ];
    
    topicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const topic = match.replace(/^[^:]+:\s*/, '').trim();
          if (topic.length > 5 && topic.length < 100) {
            topics.add(topic);
          }
        });
      }
    });
    
    return Array.from(topics);
  }

  // Extract key decisions from content
  private extractDecisions(content: string): string[] {
    const decisions = new Set<string>();
    
    const decisionPatterns = [
      /decided[:\s]+([^\n]+)/gi,
      /decision[:\s]+([^\n]+)/gi,
      /agreed[:\s]+([^\n]+)/gi,
      /resolved[:\s]+([^\n]+)/gi,
      /approved[:\s]+([^\n]+)/gi
    ];
    
    decisionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const decision = match.replace(/^[^:]+:\s*/, '').trim();
          if (decision.length > 10 && decision.length < 200) {
            decisions.add(decision);
          }
        });
      }
    });
    
    return Array.from(decisions);
  }

  // Cache management
  private getCacheKey(filePath: string, content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(filePath + content.substring(0, 1000))
      .digest('hex');
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Process single file with caching
  private async processSingleFile(filePath: string): Promise<SummaryResult> {
    const startTime = Date.now();
    
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);
      
      const content = await this.readFileContent(filePath);
      const cacheKey = this.getCacheKey(filePath, content);
      
      // Check cache first
      if (this.options.enableCache && this.cache.has(cacheKey)) {
        console.log(`💾 Cache hit for: ${path.basename(filePath)}`);
        return this.cache.get(cacheKey)!;
      }
      
      const result = await this.generateSummaryWithRetry(content, path.basename(filePath));
      
      // Cache the result
      if (this.options.enableCache) {
        this.cache.set(cacheKey, result);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Completed: ${path.basename(filePath)} (${(processingTime / 1000).toFixed(2)}s)`);
      
      this.metrics.successfulFiles++;
      this.metrics.totalProcessingTime += processingTime;
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed: ${path.basename(filePath)} - ${(error as Error).message}`);
      
      this.metrics.failedFiles++;
      this.metrics.errors.push({
        file: filePath,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Batch processing with concurrency control
  private async processBatch(files: string[]): Promise<Map<string, SummaryResult>> {
    const results = new Map<string, SummaryResult>();
    
    if (this.options.concurrent) {
      // Process files concurrently with controlled concurrency
      const batches = this.chunkArray(files, this.options.maxConcurrency ?? 5);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (filePath) => {
          try {
            const result = await this.processSingleFile(filePath);
            results.set(filePath, result);
          } catch (error) {
            // Continue processing other files even if one fails
            console.warn(`Skipping failed file: ${filePath}`);
          }
        });
        
        await Promise.all(batchPromises);
      }
    } else {
      // Process files sequentially
      for (const filePath of files) {
        try {
          const result = await this.processSingleFile(filePath);
          results.set(filePath, result);
        } catch (error) {
          console.warn(`Skipping failed file: ${filePath}`);
        }
      }
    }
    
    return results;
  }

  // Utility function to chunk array
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Enhanced output generation with multiple formats
  private async generateOutput(
    results: Map<string, SummaryResult>,
    outputDir: string
  ): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `summary-${timestamp}`;
    
    // Generate outputs in requested format(s)
    switch (this.options.outputFormat) {
      case 'json':
        await this.generateJSONOutput(results, outputDir, baseFileName);
        break;
      case 'markdown':
        await this.generateMarkdownOutput(results, outputDir, baseFileName);
        break;
      case 'html':
        await this.generateHTMLOutput(results, outputDir, baseFileName);
        break;
      default:
        await this.generateJSONOutput(results, outputDir, baseFileName);
    }
    
    // Generate metrics if enabled
    if (this.options.includeMetrics) {
      await this.generateMetricsReport(outputDir, baseFileName);
    }
  }

  // JSON output generation
  private async generateJSONOutput(
    results: Map<string, SummaryResult>,
    outputDir: string,
    baseFileName: string
  ): Promise<void> {
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: this.VERSION,
        totalFiles: results.size,
        options: this.options
      },
      results: Object.fromEntries(results)
    };
    
    const outputPath = path.join(outputDir, `${baseFileName}.json`);
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`📄 JSON output saved to: ${outputPath}`);
  }

  // Markdown output generation
  private async generateMarkdownOutput(
    results: Map<string, SummaryResult>,
    outputDir: string,
    baseFileName: string
  ): Promise<void> {
    let markdown = `# Meeting Summary Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**Total Files:** ${results.size}\n\n`;
    
    for (const [filePath, result] of results) {
      const fileName = path.basename(filePath);
      markdown += `## ${fileName}\n\n`;
      markdown += `### Summary\n${result.summary}\n\n`;
      
      if (result.actionItems.length > 0) {
        markdown += `### Action Items\n`;
        result.actionItems.forEach((item, i) => {
          markdown += `${i + 1}. ${item.text} (${item.priority})\n`;
        });
        markdown += '\n';
      }
      
      if (result.keyDecisions && result.keyDecisions.length > 0) {
        markdown += `### Key Decisions\n`;
        result.keyDecisions.forEach((decision, i) => {
          markdown += `${i + 1}. ${decision}\n`;
        });
        markdown += '\n';
      }
      
      markdown += `### Follow-up\n${result.followUpText}\n\n`;
      markdown += `---\n\n`;
    }
    
    const outputPath = path.join(outputDir, `${baseFileName}.md`);
    await fs.writeFile(outputPath, markdown);
    console.log(`📄 Markdown output saved to: ${outputPath}`);
  }

  // HTML output generation
  private async generateHTMLOutput(
    results: Map<string, SummaryResult>,
    outputDir: string,
    baseFileName: string
  ): Promise<void> {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .file-summary { margin: 20px 0; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .action-items { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .metrics { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Meeting Summary Report</h1>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total Files:</strong> ${results.size}</p>
    </div>
`;
    
    for (const [filePath, result] of results) {
      const fileName = path.basename(filePath);
      html += `
    <div class="file-summary">
        <h2>${fileName}</h2>
        <h3>Summary</h3>
        <p>${result.summary}</p>
        
        <h3>Action Items</h3>
        <div class="action-items">
            <ol>
                ${result.actionItems.map(item => `<li>${item.text} (${item.priority})</li>`).join('')}
            </ol>
        </div>
        
        <h3>Follow-up</h3>
        <p>${result.followUpText}</p>
    </div>
`;
    }
    
    html += `
</body>
</html>`;
    
    const outputPath = path.join(outputDir, `${baseFileName}.html`);
    await fs.writeFile(outputPath, html);
    console.log(`📄 HTML output saved to: ${outputPath}`);
  }

  // Generate metrics report
  private async generateMetricsReport(outputDir: string, baseFileName: string): Promise<void> {
    this.metrics.totalFiles = this.metrics.successfulFiles + this.metrics.failedFiles;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.successfulFiles;
    this.metrics.throughput = this.metrics.successfulFiles / (this.metrics.totalProcessingTime / 1000);
    
    const metricsPath = path.join(outputDir, `${baseFileName}-metrics.json`);
    await fs.writeFile(metricsPath, JSON.stringify(this.metrics, null, 2));
    console.log(`📊 Metrics report saved to: ${metricsPath}`);
  }

  // Main processing function
  async processFiles(inputPath: string, outputDir: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Enhanced AI Meeting Summary Generator v' + this.VERSION);
      console.log('=' .repeat(60));
      
      // Discover files to process
      console.log('🔍 Discovering files...');
      const files = await this.discoverFiles(inputPath);
      
      if (files.length === 0) {
        console.log('⚠️  No files found to process');
        return;
      }
      
      console.log(`📁 Found ${files.length} file(s) to process`);
      console.log('⚙️  Processing configuration:', {
        concurrent: this.options.concurrent,
        maxConcurrency: this.options.maxConcurrency,
        outputFormat: this.options.outputFormat,
        enableCache: this.options.enableCache
      });
      
      // Process files
      console.log('\n🔄 Processing files...');
      const results = await this.processBatch(files);
      
      // Generate output
      console.log('\n💾 Generating output...');
      await this.generateOutput(results, outputDir);
      
      // Final summary
      const totalTime = (Date.now() - startTime) / 1000;
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ Processing completed!');
      console.log(`📊 Results: ${this.metrics.successfulFiles} successful, ${this.metrics.failedFiles} failed`);
      console.log(`⏱️  Total time: ${totalTime.toFixed(2)} seconds`);
      console.log(`🚀 Throughput: ${(this.metrics.successfulFiles / totalTime).toFixed(2)} files/second`);
      
      if (this.metrics.failedFiles > 0) {
        console.log('\n❌ Failed files:');
        this.metrics.errors.forEach(error => {
          console.log(`   ${path.basename(error.file)}: ${error.error}`);
        });
      }
      
    } catch (error) {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    }
  }
}

// Enhanced main function with CLI argument parsing
async function main() {
  const args = process.argv.slice(2);
  const options: ProcessingOptions = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--concurrent':
        options.concurrent = args[i + 1] === 'true';
        i++;
        break;
      case '--max-concurrency':
        options.maxConcurrency = parseInt(args[i + 1]);
        i++;
        break;
      case '--output-format':
        options.outputFormat = args[i + 1] as 'json' | 'markdown' | 'html';
        i++;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[i + 1]);
        i++;
        break;
      case '--no-cache':
        options.enableCache = false;
        break;
      case '--no-metrics':
        options.includeMetrics = false;
        break;
      case '--retry-attempts':
        options.retryAttempts = parseInt(args[i + 1]);
        i++;
        break;
      case '--timeout':
        options.timeout = parseInt(args[i + 1]) * 1000; // Convert to milliseconds
        i++;
        break;
    }
  }
  
  // Default paths
  const inputPath = path.join(__dirname, '..', 'test', 'fixtures');
  const outputDir = path.join(__dirname, '..', 'test', 'output');
  
  // Create and run the enhanced generator
  const generator = new EnhancedSummaryGenerator(options);
  await generator.processFiles(inputPath, outputDir);
}

// Error handling and graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Gracefully shutting down...');
  process.exit(0);
});

// Run the enhanced main function
if (require.main === module) {
  main().catch(console.error);
}

export { EnhancedSummaryGenerator, type ProcessingOptions, type SummaryResult };