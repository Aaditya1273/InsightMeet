# Email Functionality Setup Guide

InsightMeet uses **Resend** for sending emails - a modern, developer-friendly email API that's **100% free** for up to 3,000 emails per month.

## 🚀 Quick Setup

### 1. Get Your Free Resend API Key

1. Visit [resend.com](https://resend.com/)
2. Sign up for a free account (no credit card required)
3. Go to your dashboard and create an API key
4. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Resend API key:
   ```env
   RESEND_API_KEY=re_your_actual_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### 3. Test the Email Functionality

Visit `/test-email` in your browser to test the email functionality with a comprehensive test interface.

## 📧 API Endpoints

### POST `/api/send-email`

Send an email using the Resend service.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Meeting Summary",
  "body": "Your meeting summary content here...",
  "from": "optional-sender@yourdomain.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "id": "email-id-from-resend"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

### POST `/api/email`

Alternative email endpoint with HTML formatting.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Meeting Summary",
  "content": "Your meeting summary content here..."
}
```

## 🛠️ Usage Examples

### Using the EmailSend Component

```tsx
import { EmailSend } from '../components/EmailSend';

function MyComponent() {
  const handleEmailSent = async (email: string, subject: string, content: string) => {
    // Custom email sending logic
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, body: content }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  };

  return (
    <EmailSend
      defaultEmail="user@example.com"
      defaultSubject="Meeting Summary"
      defaultContent="Your meeting summary here..."
      onSend={handleEmailSent}
    />
  );
}
```

### Direct API Call

```typescript
async function sendMeetingSummary(recipientEmail: string, summary: string) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: 'Meeting Summary - ' + new Date().toLocaleDateString(),
        body: summary,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Email sent successfully!');
    } else {
      console.error('Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Using the sendEmail Utility

```typescript
import { sendEmail } from '../lib/email/sendEmail';

async function sendCustomEmail() {
  const result = await sendEmail({
    to: 'recipient@example.com',
    subject: 'Custom Email',
    text: 'Plain text content',
    html: '<h1>HTML Content</h1><p>Rich formatting supported!</p>',
    from: 'InsightMeet <notifications@yourdomain.com>'
  });

  if (result.success) {
    console.log('Email sent:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}
```

## 🎨 Email Templates

The email utility automatically creates beautiful HTML emails from plain text, but you can also provide custom HTML:

### Auto-Generated HTML Template
- Clean, responsive design
- Branded with InsightMeet styling
- Converts line breaks to HTML
- Includes footer with copyright

### Custom HTML Template
```typescript
const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1f2937;">Meeting Summary</h1>
  <div style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
    <h2>Action Items:</h2>
    <ul>
      <li>Complete project proposal</li>
      <li>Schedule follow-up meeting</li>
    </ul>
  </div>
</div>
`;

await sendEmail({
  to: 'team@company.com',
  subject: 'Meeting Summary',
  text: 'Fallback text content',
  html: htmlContent
});
```

## 🔧 Production Setup

### Domain Verification

For production use, verify your domain in Resend:

1. Go to your Resend dashboard
2. Add and verify your domain
3. Update the `from` field in your code:
   ```typescript
   from: 'InsightMeet <notifications@yourdomain.com>'
   ```

### Rate Limits

- **Free tier**: 3,000 emails/month
- **Paid tiers**: Higher limits available
- Built-in rate limiting and error handling

### Error Handling

The email system includes comprehensive error handling:
- API key validation
- Email format validation
- Network error handling
- Detailed error messages
- Automatic retry logic (in Resend)

## 🧪 Testing

### Test Page
Visit `/test-email` for a comprehensive test interface that includes:
- Configuration status check
- Direct API testing
- Component testing
- Setup instructions

### Manual Testing
```bash
# Test the API endpoint directly
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test email from InsightMeet!"
  }'
```

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Validate email addresses on both client and server
- Implement rate limiting for production use
- Monitor email sending for abuse

## 📊 Monitoring

Monitor your email usage in the Resend dashboard:
- Delivery rates
- Bounce rates
- Monthly usage
- Error logs

## 🆘 Troubleshooting

### Common Issues

1. **"RESEND_API_KEY is not configured"**
   - Check your `.env.local` file
   - Restart your development server

2. **"Invalid email address format"**
   - Verify the recipient email format
   - Check for typos

3. **"Failed to send email"**
   - Check your API key is valid
   - Verify your Resend account status
   - Check network connectivity

4. **Emails not being received**
   - Check spam/junk folders
   - Verify the recipient email address
   - Check Resend dashboard for delivery status

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```env
NODE_ENV=development
```

This will show detailed logs in the console for troubleshooting.
