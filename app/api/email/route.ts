import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

// Initialize Resend with error handling
const resend = new Resend(process.env.RESEND_API_KEY);

// Validation schema with Zod
const emailSchema = z.object({
  to: z.union([
    z.string().email('Invalid email address'),
    z.array(z.string().email('Invalid email address')).min(1).max(50)
  ]),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  template: z.enum(['default', 'welcome', 'notification', 'reset-password', 'invoice']).optional().default('default'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    contentType: z.string()
  })).optional(),
  tags: z.array(z.string()).optional(),
  replyTo: z.string().email().optional(),
  scheduledAt: z.string().datetime().optional(),
  trackOpens: z.boolean().optional().default(true),
  trackClicks: z.boolean().optional().default(true)
});

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many email requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Email templates
const templates = {
  default: (subject: string, content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; text-align: center;">
        <img src="https://via.placeholder.com/150x50/ffffff/667eea?text=InsightMeet" alt="InsightMeet" style="max-width: 150px; height: auto;">
        <h1 style="color: #ffffff; font-size: 1.8rem; font-weight: 600; margin: 1rem 0 0 0;">
          ${subject}
        </h1>
      </div>
      <div style="padding: 2rem; background-color: #f8fafc;">
        <div style="background-color: #ffffff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #2d3748; line-height: 1.6; font-size: 16px;">
            ${content.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>
      <div style="padding: 1.5rem; background-color: #edf2f7; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #718096; font-size: 14px; margin: 0;">
          This email was sent from InsightMeet
        </p>
        <p style="color: #a0aec0; font-size: 12px; margin: 0.5rem 0 0 0;">
          © ${new Date().getFullYear()} InsightMeet. All rights reserved.
        </p>
      </div>
    </div>
  `,
  
  welcome: (subject: string, content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 3rem; text-align: center; color: white;">
        <h1 style="font-size: 2.5rem; margin: 0;">🎉 Welcome!</h1>
        <p style="font-size: 1.2rem; margin: 1rem 0 0 0; opacity: 0.9;">We're excited to have you on board</p>
      </div>
      <div style="padding: 2rem; background-color: #ffffff;">
        <div style="color: #2d3748; line-height: 1.6; font-size: 16px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <div style="text-align: center; margin-top: 2rem;">
          <a href="#" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Get Started
          </a>
        </div>
      </div>
    </div>
  `,
  
  notification: (subject: string, content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem 2rem;">
        <h2 style="color: #92400e; margin: 0; font-size: 1.3rem;">📢 ${subject}</h2>
      </div>
      <div style="padding: 2rem; background-color: #ffffff;">
        <div style="color: #2d3748; line-height: 1.6; font-size: 16px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>
  `,
  
  'reset-password': (subject: string, content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 1rem 2rem;">
        <h2 style="color: #991b1b; margin: 0; font-size: 1.3rem;">🔐 ${subject}</h2>
      </div>
      <div style="padding: 2rem; background-color: #ffffff;">
        <div style="color: #2d3748; line-height: 1.6; font-size: 16px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <div style="text-align: center; margin-top: 2rem;">
          <a href="#" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Reset Password
          </a>
        </div>
      </div>
    </div>
  `,
  
  invoice: (subject: string, content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 1rem 2rem;">
        <h2 style="color: #0c4a6e; margin: 0; font-size: 1.3rem;">💰 ${subject}</h2>
      </div>
      <div style="padding: 2rem; background-color: #ffffff;">
        <div style="color: #2d3748; line-height: 1.6; font-size: 16px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>
  `
};

// Security utilities
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

const generateEmailHash = (to: string, subject: string, content: string): string => {
  const data = `${to}-${subject}-${content}-${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
};

// Logging utility
const logEmailActivity = (action: string, data: any) => {
  console.log(`[EMAIL_API] ${new Date().toISOString()} - ${action}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Email validation and domain checking
const validateEmailDomain = (email: string): boolean => {
  const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  const domain = email.split('@')[1];
  return !blockedDomains.includes(domain);
};

// Main API handler
export async function POST(request: Request) {
  const startTime = Date.now();
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = emailSchema.parse(body);
    
    const { 
      to, 
      subject, 
      content, 
      template = 'default',
      priority = 'normal',
      attachments,
      tags,
      replyTo,
      scheduledAt,
      trackOpens = true,
      trackClicks = true
    } = validatedData;

    // Validate email domains
    const recipients = Array.isArray(to) ? to : [to];
    const invalidEmails = recipients.filter(email => !validateEmailDomain(email));
    
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email domains detected', invalidEmails },
        { status: 400 }
      );
    }

    // Generate unique email hash for tracking
    const emailHash = generateEmailHash(recipients.join(','), subject, content);
    
    // Log email attempt
    logEmailActivity('EMAIL_ATTEMPT', {
      hash: emailHash,
      to: recipients.length,
      subject: subject.substring(0, 50),
      template,
      priority,
      clientIp
    });

    // Sanitize content
    const sanitizedContent = sanitizeHtml(content);
    
    // Generate HTML using selected template
    const htmlContent = templates[template](subject, sanitizedContent);
    
    // Prepare email data
    const emailData: any = {
      from: 'InsightMeet <notifications@insightmeet.app>',
      to: recipients,
      subject,
      html: htmlContent,
      text: content, // Plain text version
      tags: tags || [template, priority],
      headers: {
        'X-Email-Hash': emailHash,
        'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3'
      }
    };

    // Add optional fields
    if (replyTo) emailData.replyTo = replyTo;
    if (attachments) emailData.attachments = attachments;
    if (scheduledAt) emailData.scheduledAt = scheduledAt;
    
    // Configure tracking
    if (trackOpens || trackClicks) {
      emailData.tags.push('tracking-enabled');
    }

    // Send email
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      logEmailActivity('EMAIL_FAILED', {
        hash: emailHash,
        error: error.message,
        clientIp
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to send email', 
          details: process.env.NODE_ENV === 'development' ? error.message : undefined 
        },
        { status: 500 }
      );
    }

    // Log successful send
    logEmailActivity('EMAIL_SUCCESS', {
      hash: emailHash,
      emailId: data?.id,
      recipients: recipients.length,
      processingTime: Date.now() - startTime,
      clientIp
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        id: data?.id,
        hash: emailHash,
        recipients: recipients.length,
        template,
        priority,
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    // Handle other errors
    logEmailActivity('EMAIL_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientIp,
      processingTime: Date.now() - startTime
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for email status and analytics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('id');
    const hash = searchParams.get('hash');
    
    if (!emailId && !hash) {
      return NextResponse.json(
        { error: 'Email ID or hash is required' },
        { status: 400 }
      );
    }

    // Here you would typically query your database for email status
    // For now, return a mock response
    return NextResponse.json({
      success: true,
      data: {
        id: emailId,
        hash,
        status: 'delivered', // delivered, opened, clicked, bounced, complained
        sent: new Date().toISOString(),
        opened: null,
        clicked: null,
        bounced: false,
        complained: false
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}