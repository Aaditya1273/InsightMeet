import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, content } = await request.json();

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a production app, you might want to validate the email address
    // and implement rate limiting here

    const { data, error } = await resend.emails.send({
      from: 'InsightMeet <notifications@insightmeet.app>',
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f3f4f6; padding: 2rem; border-radius: 0.5rem;">
            <h1 style="color: #111827; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
              ${subject}
            </h1>
            <div style="color: #4b5563; line-height: 1.5;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
              <p>This email was sent from InsightMeet.</p>
              <p>© ${new Date().getFullYear()} InsightMeet. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data
    });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
