/**
 * Email Templates for InsightMeet
 * 
 * This module provides pre-built email templates for different types of
 * meeting-related communications. All templates are responsive and branded.
 */

export interface MeetingSummaryData {
  meetingTitle: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee: string;
    dueDate: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  nextSteps?: string[];
  attachments?: Array<{
    name: string;
    url: string;
  }>;
}

export interface ActionItemReminderData {
  recipientName: string;
  meetingTitle: string;
  actionItems: Array<{
    task: string;
    dueDate: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  meetingDate: string;
}

export interface FollowUpData {
  recipientName: string;
  meetingTitle: string;
  date: string;
  keyDecisions: string[];
  nextMeetingDate?: string;
  additionalNotes?: string;
}

/**
 * Generate HTML email template for meeting summary
 */
export function generateMeetingSummaryTemplate(data: MeetingSummaryData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Summary - ${data.meetingTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 1.8rem; font-weight: 600;">📋 Meeting Summary</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0 0; font-size: 1rem;">${data.meetingTitle}</p>
        </div>

        <!-- Meeting Details -->
        <div style="padding: 2rem; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <strong style="color: #4a5568;">📅 Date:</strong><br>
              <span style="color: #718096;">${data.date}</span>
            </div>
            <div>
              <strong style="color: #4a5568;">⏱️ Duration:</strong><br>
              <span style="color: #718096;">${data.duration}</span>
            </div>
          </div>
          
          ${data.participants.length > 0 ? `
          <div style="margin-top: 1rem;">
            <strong style="color: #4a5568;">👥 Participants:</strong><br>
            <span style="color: #718096;">${data.participants.join(', ')}</span>
          </div>
          ` : ''}
        </div>

        <!-- Summary -->
        <div style="padding: 2rem;">
          <h2 style="color: #2d3748; font-size: 1.3rem; margin: 0 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">📝 Summary</h2>
          <div style="color: #4a5568; line-height: 1.7; white-space: pre-wrap;">${data.summary}</div>
        </div>

        ${data.keyPoints.length > 0 ? `
        <!-- Key Points -->
        <div style="padding: 0 2rem 2rem 2rem;">
          <h2 style="color: #2d3748; font-size: 1.3rem; margin: 0 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">🎯 Key Points</h2>
          <ul style="color: #4a5568; padding-left: 1.5rem; margin: 0;">
            ${data.keyPoints.map(point => `<li style="margin-bottom: 0.5rem;">${point}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${data.actionItems.length > 0 ? `
        <!-- Action Items -->
        <div style="padding: 0 2rem 2rem 2rem;">
          <h2 style="color: #2d3748; font-size: 1.3rem; margin: 0 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">✅ Action Items</h2>
          <div style="space-y: 1rem;">
            ${data.actionItems.map((item, index) => `
              <div style="background-color: #f7fafc; border-left: 4px solid ${item.priority === 'high' ? '#f56565' : item.priority === 'medium' ? '#ed8936' : '#48bb78'}; padding: 1rem; margin-bottom: 1rem; border-radius: 0 0.375rem 0.375rem 0;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 0.5rem;">${index + 1}. ${item.task}</div>
                <div style="font-size: 0.875rem; color: #718096;">
                  <strong>Assignee:</strong> ${item.assignee} | 
                  <strong>Due:</strong> ${item.dueDate}
                  ${item.priority ? ` | <strong>Priority:</strong> <span style="color: ${item.priority === 'high' ? '#f56565' : item.priority === 'medium' ? '#ed8936' : '#48bb78'}; text-transform: uppercase; font-weight: 600;">${item.priority}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${data.nextSteps && data.nextSteps.length > 0 ? `
        <!-- Next Steps -->
        <div style="padding: 0 2rem 2rem 2rem;">
          <h2 style="color: #2d3748; font-size: 1.3rem; margin: 0 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">🚀 Next Steps</h2>
          <ul style="color: #4a5568; padding-left: 1.5rem; margin: 0;">
            ${data.nextSteps.map(step => `<li style="margin-bottom: 0.5rem;">${step}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${data.attachments && data.attachments.length > 0 ? `
        <!-- Attachments -->
        <div style="padding: 0 2rem 2rem 2rem;">
          <h2 style="color: #2d3748; font-size: 1.3rem; margin: 0 0 1rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">📎 Attachments</h2>
          <div>
            ${data.attachments.map(attachment => `
              <a href="${attachment.url}" style="display: inline-block; background-color: #edf2f7; color: #4a5568; text-decoration: none; padding: 0.5rem 1rem; margin: 0.25rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; font-size: 0.875rem;">
                📄 ${attachment.name}
              </a>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="background-color: #2d3748; color: white; padding: 2rem; text-align: center;">
          <p style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 500;">Generated by InsightMeet</p>
          <p style="margin: 0; font-size: 0.875rem; color: #a0aec0;">AI-powered meeting insights and summaries</p>
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #4a5568;">
            <p style="margin: 0; font-size: 0.75rem; color: #718096;">
              © ${new Date().getFullYear()} InsightMeet. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MEETING SUMMARY - ${data.meetingTitle}

📅 Date: ${data.date}
⏱️ Duration: ${data.duration}
${data.participants.length > 0 ? `👥 Participants: ${data.participants.join(', ')}` : ''}

📝 SUMMARY
${data.summary}

${data.keyPoints.length > 0 ? `
🎯 KEY POINTS
${data.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}
` : ''}

${data.actionItems.length > 0 ? `
✅ ACTION ITEMS
${data.actionItems.map((item, index) => `${index + 1}. ${item.task}
   Assignee: ${item.assignee}
   Due: ${item.dueDate}${item.priority ? `\n   Priority: ${item.priority.toUpperCase()}` : ''}`).join('\n\n')}
` : ''}

${data.nextSteps && data.nextSteps.length > 0 ? `
🚀 NEXT STEPS
${data.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
` : ''}

${data.attachments && data.attachments.length > 0 ? `
📎 ATTACHMENTS
${data.attachments.map(attachment => `- ${attachment.name}: ${attachment.url}`).join('\n')}
` : ''}

---
Generated by InsightMeet
AI-powered meeting insights and summaries
© ${new Date().getFullYear()} InsightMeet. All rights reserved.
  `.trim();

  return { html, text };
}

/**
 * Generate HTML email template for action item reminders
 */
export function generateActionItemReminderTemplate(data: ActionItemReminderData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Action Item Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 2rem; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 1.8rem; font-weight: 600;">⏰ Action Item Reminder</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0 0; font-size: 1rem;">Don't forget your commitments!</p>
        </div>

        <!-- Content -->
        <div style="padding: 2rem;">
          <p style="font-size: 1.1rem; color: #2d3748; margin: 0 0 1.5rem 0;">
            Hi ${data.recipientName},
          </p>
          
          <p style="color: #4a5568; margin: 0 0 1.5rem 0;">
            This is a friendly reminder about your action items from the meeting "<strong>${data.meetingTitle}</strong>" on ${data.meetingDate}.
          </p>

          <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 1.5rem; margin: 1.5rem 0; border-radius: 0 0.375rem 0.375rem 0;">
            <h3 style="color: #c53030; margin: 0 0 1rem 0; font-size: 1.1rem;">📋 Your Action Items:</h3>
            ${data.actionItems.map((item, index) => `
              <div style="background-color: white; padding: 1rem; margin-bottom: 1rem; border-radius: 0.375rem; border: 1px solid #fed7d7;">
                <div style="font-weight: 600; color: #2d3748; margin-bottom: 0.5rem;">${index + 1}. ${item.task}</div>
                <div style="font-size: 0.875rem; color: #718096;">
                  <strong>Due:</strong> ${item.dueDate}
                  ${item.priority ? ` | <strong>Priority:</strong> <span style="color: ${item.priority === 'high' ? '#f56565' : item.priority === 'medium' ? '#ed8936' : '#48bb78'}; text-transform: uppercase; font-weight: 600;">${item.priority}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <p style="color: #4a5568; margin: 1.5rem 0;">
            Please make sure to complete these items by their due dates. If you need any clarification or assistance, don't hesitate to reach out to the team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; color: white; padding: 2rem; text-align: center;">
          <p style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 500;">InsightMeet Reminder Service</p>
          <p style="margin: 0; font-size: 0.875rem; color: #a0aec0;">Keeping your meetings productive</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
ACTION ITEM REMINDER

Hi ${data.recipientName},

This is a friendly reminder about your action items from the meeting "${data.meetingTitle}" on ${data.meetingDate}.

YOUR ACTION ITEMS:
${data.actionItems.map((item, index) => `${index + 1}. ${item.task}
   Due: ${item.dueDate}${item.priority ? `\n   Priority: ${item.priority.toUpperCase()}` : ''}`).join('\n\n')}

Please make sure to complete these items by their due dates. If you need any clarification or assistance, don't hesitate to reach out to the team.

---
InsightMeet Reminder Service
Keeping your meetings productive
  `.trim();

  return { html, text };
}

/**
 * Generate simple follow-up email template
 */
export function generateFollowUpTemplate(data: FollowUpData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Follow-up</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 2rem; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 1.8rem; font-weight: 600;">💬 Meeting Follow-up</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0 0; font-size: 1rem;">${data.meetingTitle}</p>
        </div>

        <!-- Content -->
        <div style="padding: 2rem;">
          <p style="font-size: 1.1rem; color: #2d3748; margin: 0 0 1.5rem 0;">
            Hi ${data.recipientName},
          </p>
          
          <p style="color: #4a5568; margin: 0 0 1.5rem 0;">
            Thank you for participating in our meeting "${data.meetingTitle}" on ${data.date}. Here's a quick follow-up with the key decisions made:
          </p>

          <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 1.5rem; margin: 1.5rem 0; border-radius: 0 0.375rem 0.375rem 0;">
            <h3 style="color: #2f855a; margin: 0 0 1rem 0; font-size: 1.1rem;">🎯 Key Decisions:</h3>
            <ul style="color: #4a5568; margin: 0; padding-left: 1.5rem;">
              ${data.keyDecisions.map(decision => `<li style="margin-bottom: 0.5rem;">${decision}</li>`).join('')}
            </ul>
          </div>

          ${data.nextMeetingDate ? `
          <div style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 1.5rem; margin: 1.5rem 0; border-radius: 0 0.375rem 0.375rem 0;">
            <p style="color: #2b6cb0; margin: 0; font-weight: 600;">📅 Next Meeting: ${data.nextMeetingDate}</p>
          </div>
          ` : ''}

          ${data.additionalNotes ? `
          <div style="background-color: #fffbeb; border-left: 4px solid #f6ad55; padding: 1.5rem; margin: 1.5rem 0; border-radius: 0 0.375rem 0.375rem 0;">
            <h3 style="color: #c05621; margin: 0 0 1rem 0; font-size: 1.1rem;">📝 Additional Notes:</h3>
            <p style="color: #4a5568; margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
          </div>
          ` : ''}

          <p style="color: #4a5568; margin: 1.5rem 0 0 0;">
            If you have any questions or need clarification on any of these points, please don't hesitate to reach out.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; color: white; padding: 2rem; text-align: center;">
          <p style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 500;">InsightMeet Follow-up</p>
          <p style="margin: 0; font-size: 0.875rem; color: #a0aec0;">Keeping everyone aligned</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MEETING FOLLOW-UP - ${data.meetingTitle}

Hi ${data.recipientName},

Thank you for participating in our meeting "${data.meetingTitle}" on ${data.date}. Here's a quick follow-up with the key decisions made:

KEY DECISIONS:
${data.keyDecisions.map((decision, index) => `${index + 1}. ${decision}`).join('\n')}

${data.nextMeetingDate ? `NEXT MEETING: ${data.nextMeetingDate}` : ''}

${data.additionalNotes ? `
ADDITIONAL NOTES:
${data.additionalNotes}
` : ''}

If you have any questions or need clarification on any of these points, please don't hesitate to reach out.

---
InsightMeet Follow-up
Keeping everyone aligned
  `.trim();

  return { html, text };
}
