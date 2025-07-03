/**
 * Email Queue System for InsightMeet
 * 
 * Handles bulk email sending with rate limiting and retry logic
 * to stay within Resend's free tier limits and ensure delivery
 */

import { sendEmail, SendEmailParams } from './sendEmail';

interface QueuedEmail extends SendEmailParams {
  id: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

interface EmailQueueOptions {
  maxConcurrent: number; // Maximum concurrent emails
  rateLimitPerMinute: number; // Rate limit per minute
  retryDelay: number; // Delay between retries in ms
  maxRetries: number; // Maximum retry attempts
}

class EmailQueue {
  private queue: QueuedEmail[] = [];
  private processing: boolean = false;
  private sentCount: number = 0;
  private lastResetTime: number = Date.now();
  private options: EmailQueueOptions;

  constructor(options: Partial<EmailQueueOptions> = {}) {
    this.options = {
      maxConcurrent: 5,
      rateLimitPerMinute: 50, // Conservative limit for free tier
      retryDelay: 5000, // 5 seconds
      maxRetries: 3,
      ...options
    };
  }

  /**
   * Add email to queue
   */
  async addToQueue(
    emailParams: Omit<SendEmailParams, 'attachments'>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      scheduledAt?: Date;
      maxAttempts?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const emailId = this.generateId();
    
    const queuedEmail: QueuedEmail = {
      ...emailParams,
      id: emailId,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.options.maxRetries,
      scheduledAt: options.scheduledAt || new Date(),
      priority: options.priority || 'medium',
      metadata: options.metadata
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queuedEmail.priority);
    this.queue.splice(insertIndex, 0, queuedEmail);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return emailId;
  }

  /**
   * Add multiple emails to queue (bulk operation)
   */
  async addBulkToQueue(
    emails: Array<{
      emailParams: Omit<SendEmailParams, 'attachments'>;
      options?: {
        priority?: 'high' | 'medium' | 'low';
        scheduledAt?: Date;
        maxAttempts?: number;
        metadata?: Record<string, any>;
      };
    }>
  ): Promise<string[]> {
    const emailIds: string[] = [];

    for (const { emailParams, options = {} } of emails) {
      const emailId = await this.addToQueue(emailParams, options);
      emailIds.push(emailId);
    }

    return emailIds;
  }

  /**
   * Process the email queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Check rate limit
        if (!this.canSendEmail()) {
          await this.waitForRateLimit();
          continue;
        }

        // Get next email to process
        const email = this.getNextEmail();
        if (!email) {
          break;
        }

        try {
          // Send email
          const result = await sendEmail({
            to: email.to,
            subject: email.subject,
            text: email.text,
            html: email.html,
            from: email.from,
            cc: email.cc,
            bcc: email.bcc,
            tags: email.tags
          });

          if (result.success) {
            console.log(`Email sent successfully: ${email.id}`);
            this.removeFromQueue(email.id);
            this.incrementSentCount();
          } else {
            throw new Error(result.error || 'Failed to send email');
          }
        } catch (error) {
          console.error(`Failed to send email ${email.id}:`, error);
          await this.handleEmailFailure(email, error as Error);
        }

        // Small delay between emails
        await this.delay(100);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handle email sending failure
   */
  private async handleEmailFailure(email: QueuedEmail, error: Error): Promise<void> {
    email.attempts++;

    if (email.attempts >= email.maxAttempts) {
      console.error(`Email ${email.id} failed permanently after ${email.attempts} attempts`);
      this.removeFromQueue(email.id);
      // Could emit event or log to external service here
    } else {
      console.log(`Email ${email.id} failed, retrying in ${this.options.retryDelay}ms (attempt ${email.attempts}/${email.maxAttempts})`);
      
      // Schedule retry
      email.scheduledAt = new Date(Date.now() + this.options.retryDelay);
      
      // Move to end of queue for retry
      this.removeFromQueue(email.id);
      this.queue.push(email);
    }
  }

  /**
   * Check if we can send email based on rate limits
   */
  private canSendEmail(): boolean {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.sentCount = 0;
      this.lastResetTime = now;
      return true;
    }

    return this.sentCount < this.options.rateLimitPerMinute;
  }

  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const waitTime = 60000 - timeSinceReset;

    if (waitTime > 0) {
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }
  }

  /**
   * Get next email to process
   */
  private getNextEmail(): QueuedEmail | null {
    const now = new Date();
    
    for (let i = 0; i < this.queue.length; i++) {
      const email = this.queue[i];
      if (email.scheduledAt <= now) {
        return email;
      }
    }

    return null;
  }

  /**
   * Find insert index based on priority
   */
  private findInsertIndex(priority: 'high' | 'medium' | 'low'): number {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.queue.length; i++) {
      const emailPriority = priorityOrder[this.queue[i].priority];
      if (emailPriority > targetPriority) {
        return i;
      }
    }

    return this.queue.length;
  }

  /**
   * Remove email from queue
   */
  private removeFromQueue(emailId: string): void {
    const index = this.queue.findIndex(email => email.id === emailId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Increment sent count
   */
  private incrementSentCount(): void {
    this.sentCount++;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    sentThisMinute: number;
    rateLimitPerMinute: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      sentThisMinute: this.sentCount,
      rateLimitPerMinute: this.options.rateLimitPerMinute
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Get queued emails
   */
  getQueuedEmails(): Array<{
    id: string;
    to: string | string[];
    subject: string;
    priority: string;
    attempts: number;
    scheduledAt: Date;
  }> {
    return this.queue.map(email => ({
      id: email.id,
      to: email.to,
      subject: email.subject,
      priority: email.priority,
      attempts: email.attempts,
      scheduledAt: email.scheduledAt
    }));
  }
}

// Export singleton instance
export const emailQueue = new EmailQueue();

// Export class for custom instances
export { EmailQueue };
export type { QueuedEmail, EmailQueueOptions };
