import { NextResponse } from 'next/server';
import { sendEmail } from '../../../lib/email/sendEmail';

export async function POST(request: Request) {
  try {
    const { to, subject, body, from } = await request.json();

    // Validate required fields
    if (!to || !subject || !body) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, subject, or body'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email address format'
      }, { status: 400 });
    }

    // Send email using the sendEmail utility
    const result = await sendEmail({
      to,
      subject,
      text: body,
      from: from || 'InsightMeet <notifications@insightmeet.app>'
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in /api/send-email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
