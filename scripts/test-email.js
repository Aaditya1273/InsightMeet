#!/usr/bin/env node

/**
 * Email Testing Script for InsightMeet
 * 
 * This script tests the email functionality by sending a test email
 * using the Resend API. Run this script to verify your email setup.
 * 
 * Usage:
 *   node scripts/test-email.js your-email@example.com
 * 
 * Make sure to set RESEND_API_KEY in your .env.local file first.
 */

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function testEmail(recipientEmail) {
  // Validate API key
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY not found in environment variables');
    console.log('💡 Make sure to:');
    console.log('   1. Copy .env.example to .env.local');
    console.log('   2. Add your Resend API key to .env.local');
    console.log('   3. Get a free API key from https://resend.com/');
    process.exit(1);
  }

  // Validate email parameter
  if (!recipientEmail) {
    console.error('❌ Error: Please provide a recipient email address');
    console.log('💡 Usage: node scripts/test-email.js your-email@example.com');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    console.error('❌ Error: Invalid email address format');
    process.exit(1);
  }

  console.log('🚀 Testing InsightMeet Email Functionality');
  console.log('📧 Recipient:', recipientEmail);
  console.log('🔑 API Key:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  console.log('');

  const resend = new Resend(process.env.RESEND_API_KEY);

  const testEmailContent = {
    from: 'InsightMeet <notifications@insightmeet.app>',
    to: [recipientEmail],
    subject: '✅ InsightMeet Email Test - ' + new Date().toLocaleString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f9fafb; padding: 2rem; border-radius: 0.5rem; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #1f2937; font-size: 2rem; margin: 0;">✅ Email Test Successful!</h1>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">InsightMeet Email Functionality</p>
          </div>
          
          <div style="background-color: white; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <h2 style="color: #1f2937; font-size: 1.25rem; margin: 0 0 1rem 0;">🎉 Congratulations!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 1rem 0;">
              Your InsightMeet email functionality is working perfectly! This test email confirms that:
            </p>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
              <li>✅ Resend API key is configured correctly</li>
              <li>✅ Email sending functionality is operational</li>
              <li>✅ HTML email formatting is working</li>
              <li>✅ Your email infrastructure is ready for production</li>
            </ul>
          </div>

          <div style="background-color: #dbeafe; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem;">
            <h3 style="color: #1e40af; font-size: 1rem; margin: 0 0 0.5rem 0;">📋 Test Details</h3>
            <p style="color: #1e40af; font-size: 0.875rem; margin: 0; font-family: monospace;">
              <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
              <strong>Recipient:</strong> ${recipientEmail}<br>
              <strong>Service:</strong> Resend API<br>
              <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
            </p>
          </div>

          <div style="background-color: #f0fdf4; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #22c55e; margin-bottom: 1.5rem;">
            <h3 style="color: #15803d; font-size: 1rem; margin: 0 0 0.5rem 0;">🚀 Next Steps</h3>
            <p style="color: #15803d; font-size: 0.875rem; margin: 0 0 0.5rem 0;">
              Your email system is ready! You can now:
            </p>
            <ul style="color: #15803d; font-size: 0.875rem; margin: 0; padding-left: 1.5rem;">
              <li>Send meeting summaries to participants</li>
              <li>Deliver action items and follow-ups</li>
              <li>Share calendar invites and reminders</li>
              <li>Integrate with your meeting workflow</li>
            </ul>
          </div>

          <div style="text-align: center; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
              This email was sent from <strong>InsightMeet</strong><br>
              AI-powered meeting insights and summaries
            </p>
            <p style="color: #9ca3af; font-size: 0.75rem; margin: 0.5rem 0 0 0;">
              © ${new Date().getFullYear()} InsightMeet. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `✅ InsightMeet Email Test - ${new Date().toLocaleString()}

🎉 Congratulations!

Your InsightMeet email functionality is working perfectly! This test email confirms that:

✅ Resend API key is configured correctly
✅ Email sending functionality is operational  
✅ HTML email formatting is working
✅ Your email infrastructure is ready for production

📋 Test Details:
Timestamp: ${new Date().toISOString()}
Recipient: ${recipientEmail}
Service: Resend API
Environment: ${process.env.NODE_ENV || 'development'}

🚀 Next Steps:
Your email system is ready! You can now:
- Send meeting summaries to participants
- Deliver action items and follow-ups
- Share calendar invites and reminders
- Integrate with your meeting workflow

This email was sent from InsightMeet
AI-powered meeting insights and summaries

© ${new Date().getFullYear()} InsightMeet. All rights reserved.`
  };

  try {
    console.log('📤 Sending test email...');
    const { data, error } = await resend.emails.send(testEmailContent);

    if (error) {
      console.error('❌ Failed to send email:');
      console.error('   Error:', error.message || error);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Check your RESEND_API_KEY is valid');
      console.log('   2. Verify your Resend account is active');
      console.log('   3. Check your internet connection');
      console.log('   4. Visit https://resend.com/docs for help');
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', data.id);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Check your email inbox (including spam folder)');
    console.log('   2. Visit /test-email in your browser for more testing');
    console.log('   3. Start integrating email into your meeting workflow');
    console.log('');
    console.log('📊 Monitor your emails at: https://resend.com/emails');

  } catch (error) {
    console.error('❌ Unexpected error occurred:');
    console.error('   Error:', error.message);
    console.log('');
    console.log('🔧 Please check:');
    console.log('   1. Your internet connection');
    console.log('   2. Your Resend API key');
    console.log('   3. The recipient email address');
    process.exit(1);
  }
}

// Get recipient email from command line arguments
const recipientEmail = process.argv[2];
testEmail(recipientEmail);
