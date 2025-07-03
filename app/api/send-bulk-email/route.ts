import { NextResponse } from 'next/server';
import { emailQueue } from '../../../lib/email/emailQueue';
import { 
  generateMeetingSummaryTemplate, 
  generateActionItemReminderTemplate,
  generateFollowUpTemplate,
  type MeetingSummaryData,
  type ActionItemReminderData,
  type FollowUpData
} from '../../../lib/email/templates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, recipients, data, options = {} } = body;

    // Validate required fields
    if (!type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type, recipients (array)'
      }, { status: 400 });
    }

    // Validate recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of recipients) {
      if (typeof recipient === 'string') {
        if (!emailRegex.test(recipient)) {
          return NextResponse.json({
            success: false,
            error: `Invalid email address: ${recipient}`
          }, { status: 400 });
        }
      } else if (typeof recipient === 'object' && recipient.email) {
        if (!emailRegex.test(recipient.email)) {
          return NextResponse.json({
            success: false,
            error: `Invalid email address: ${recipient.email}`
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Recipients must be email strings or objects with email property'
        }, { status: 400 });
      }
    }

    let emailIds: string[] = [];

    switch (type) {
      case 'meeting-summary':
        emailIds = await handleMeetingSummary(recipients, data as MeetingSummaryData, options);
        break;
      
      case 'action-reminder':
        emailIds = await handleActionReminder(recipients, data as ActionItemReminderData, options);
        break;
      
      case 'follow-up':
        emailIds = await handleFollowUp(recipients, data as FollowUpData, options);
        break;
      
      case 'custom':
        emailIds = await handleCustomEmail(recipients, data, options);
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported email type: ${type}. Supported types: meeting-summary, action-reminder, follow-up, custom`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${emailIds.length} emails queued successfully`,
      data: {
        emailIds,
        queueStatus: emailQueue.getQueueStatus()
      }
    });

  } catch (error: any) {
    console.error('Error in /api/send-bulk-email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

async function handleMeetingSummary(
  recipients: any[], 
  data: MeetingSummaryData, 
  options: any
): Promise<string[]> {
  const { html, text } = generateMeetingSummaryTemplate(data);
  
  const emails = recipients.map(recipient => {
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const name = typeof recipient === 'object' ? recipient.name : email.split('@')[0];
    
    return {
      emailParams: {
        to: email,
        subject: options.subject || `Meeting Summary: ${data.meetingTitle}`,
        text: text,
        html: html,
        from: options.from || 'InsightMeet <notifications@insightmeet.app>',
        tags: [
          { name: 'type', value: 'meeting-summary' },
          { name: 'meeting', value: data.meetingTitle }
        ]
      },
      options: {
        priority: options.priority || 'medium',
        scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : undefined,
        metadata: {
          recipientName: name,
          meetingTitle: data.meetingTitle,
          meetingDate: data.date
        }
      }
    };
  });

  return await emailQueue.addBulkToQueue(emails);
}

async function handleActionReminder(
  recipients: any[], 
  data: ActionItemReminderData, 
  options: any
): Promise<string[]> {
  const emails = recipients.map(recipient => {
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const name = typeof recipient === 'object' ? recipient.name : email.split('@')[0];
    
    // Customize data for each recipient
    const personalizedData = {
      ...data,
      recipientName: name
    };
    
    const { html, text } = generateActionItemReminderTemplate(personalizedData);
    
    return {
      emailParams: {
        to: email,
        subject: options.subject || `Action Item Reminder: ${data.meetingTitle}`,
        text: text,
        html: html,
        from: options.from || 'InsightMeet <notifications@insightmeet.app>',
        tags: [
          { name: 'type', value: 'action-reminder' },
          { name: 'meeting', value: data.meetingTitle }
        ]
      },
      options: {
        priority: options.priority || 'high', // Reminders are high priority
        scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : undefined,
        metadata: {
          recipientName: name,
          meetingTitle: data.meetingTitle,
          actionItemCount: data.actionItems.length
        }
      }
    };
  });

  return await emailQueue.addBulkToQueue(emails);
}

async function handleFollowUp(
  recipients: any[], 
  data: FollowUpData, 
  options: any
): Promise<string[]> {
  const emails = recipients.map(recipient => {
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const name = typeof recipient === 'object' ? recipient.name : email.split('@')[0];
    
    // Customize data for each recipient
    const personalizedData = {
      ...data,
      recipientName: name
    };
    
    const { html, text } = generateFollowUpTemplate(personalizedData);
    
    return {
      emailParams: {
        to: email,
        subject: options.subject || `Follow-up: ${data.meetingTitle}`,
        text: text,
        html: html,
        from: options.from || 'InsightMeet <notifications@insightmeet.app>',
        tags: [
          { name: 'type', value: 'follow-up' },
          { name: 'meeting', value: data.meetingTitle }
        ]
      },
      options: {
        priority: options.priority || 'medium',
        scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : undefined,
        metadata: {
          recipientName: name,
          meetingTitle: data.meetingTitle,
          meetingDate: data.date
        }
      }
    };
  });

  return await emailQueue.addBulkToQueue(emails);
}

async function handleCustomEmail(
  recipients: any[], 
  data: any, 
  options: any
): Promise<string[]> {
  if (!data.subject || !data.content) {
    throw new Error('Custom emails require subject and content fields');
  }

  const emails = recipients.map(recipient => {
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const name = typeof recipient === 'object' ? recipient.name : email.split('@')[0];
    
    // Replace placeholders in content
    let personalizedContent = data.content;
    personalizedContent = personalizedContent.replace(/\{name\}/g, name);
    personalizedContent = personalizedContent.replace(/\{email\}/g, email);
    
    return {
      emailParams: {
        to: email,
        subject: data.subject,
        text: personalizedContent,
        html: data.html || undefined,
        from: options.from || 'InsightMeet <notifications@insightmeet.app>',
        tags: [
          { name: 'type', value: 'custom' }
        ]
      },
      options: {
        priority: options.priority || 'medium',
        scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : undefined,
        metadata: {
          recipientName: name,
          customType: data.customType || 'general'
        }
      }
    };
  });

  return await emailQueue.addBulkToQueue(emails);
}

// GET endpoint to check queue status
export async function GET() {
  try {
    const status = emailQueue.getQueueStatus();
    const queuedEmails = emailQueue.getQueuedEmails();

    return NextResponse.json({
      success: true,
      data: {
        status,
        queuedEmails: queuedEmails.slice(0, 10) // Return first 10 for preview
      }
    });
  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
