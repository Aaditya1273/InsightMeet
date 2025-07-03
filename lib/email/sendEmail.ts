import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[]; // Support multiple recipients
  subject: string;
  text: string;
  html?: string; // Optional HTML content
  from?: string; // Optional sender email
  cc?: string[]; // Optional CC recipients
  bcc?: string[]; // Optional BCC recipients
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>; // Optional attachments
  tags?: Array<{
    name: string;
    value: string;
  }>; // Optional email tags for tracking
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = 'InsightMeet <notifications@insightmeet.app>',
  cc,
  bcc,
  attachments,
  tags
}: SendEmailParams) {
  try {
    // Validate API key
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Validate recipients
    const recipients = Array.isArray(to) ? to : [to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Prepare email payload
    const emailPayload: any = {
      from: from,
      to: recipients,
      subject: subject,
      text: text,
    };

    // Add optional fields
    if (cc && cc.length > 0) emailPayload.cc = cc;
    if (bcc && bcc.length > 0) emailPayload.bcc = bcc;
    if (attachments && attachments.length > 0) emailPayload.attachments = attachments;
    if (tags && tags.length > 0) emailPayload.tags = tags;

    // Add HTML content if provided, otherwise create a simple HTML version
    if (html) {
      emailPayload.html = html;
    } else {
      // Create a simple HTML version from text
      emailPayload.html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f9fafb; padding: 2rem; border-radius: 0.5rem;">
            <h1 style="color: #111827; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
              ${subject}
            </h1>
            <div style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">
              ${text.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
              <p>This email was sent from InsightMeet.</p>
              <p>© ${new Date().getFullYear()} InsightMeet. All rights reserved.</p>
            </div>
          </div>
        </div>
      `;
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
