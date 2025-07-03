# InsightMeet Email API Reference

## Overview

InsightMeet provides a comprehensive email system with support for single emails, bulk sending, templates, and queue management. All email functionality uses the **Resend API** (free tier: 3,000 emails/month).

## API Endpoints

### 1. Send Single Email

**Endpoint:** `POST /api/send-email`

Send a single email with custom content.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "Email content in plain text",
  "from": "sender@yourdomain.com" // Optional
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

### 2. Send Bulk Emails

**Endpoint:** `POST /api/send-bulk-email`

Send multiple emails using templates or custom content with queue management.

**Request Body:**
```json
{
  "type": "meeting-summary", // or "action-reminder", "follow-up", "custom"
  "recipients": [
    "user1@example.com",
    {
      "email": "user2@example.com",
      "name": "John Doe"
    }
  ],
  "data": {
    // Data structure depends on email type (see below)
  },
  "options": {
    "subject": "Custom Subject", // Optional override
    "priority": "high", // "high", "medium", "low"
    "scheduledAt": "2024-01-15T10:00:00Z", // Optional scheduling
    "from": "sender@yourdomain.com" // Optional custom sender
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "5 emails queued successfully",
  "data": {
    "emailIds": ["email_1", "email_2", "..."],
    "queueStatus": {
      "queueLength": 5,
      "processing": true,
      "sentThisMinute": 2,
      "rateLimitPerMinute": 50
    }
  }
}
```

### 3. Check Queue Status

**Endpoint:** `GET /api/send-bulk-email`

Get current email queue status and queued emails.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": {
      "queueLength": 3,
      "processing": true,
      "sentThisMinute": 5,
      "rateLimitPerMinute": 50
    },
    "queuedEmails": [
      {
        "id": "email_123",
        "to": "user@example.com",
        "subject": "Meeting Summary",
        "priority": "medium",
        "attempts": 0,
        "scheduledAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

## Email Types and Data Structures

### Meeting Summary

**Type:** `meeting-summary`

**Data Structure:**
```json
{
  "meetingTitle": "Q4 Planning Meeting",
  "date": "2024-01-15",
  "duration": "2 hours",
  "participants": ["john@company.com", "jane@company.com"],
  "summary": "Meeting summary text...",
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ],
  "actionItems": [
    {
      "task": "Complete project proposal",
      "assignee": "John Doe",
      "dueDate": "2024-01-20",
      "priority": "high"
    }
  ],
  "nextSteps": ["Step 1", "Step 2"], // Optional
  "attachments": [ // Optional
    {
      "name": "Meeting Notes.pdf",
      "url": "https://example.com/file.pdf"
    }
  ]
}
```

### Action Item Reminder

**Type:** `action-reminder`

**Data Structure:**
```json
{
  "meetingTitle": "Q4 Planning Meeting",
  "meetingDate": "2024-01-15",
  "actionItems": [
    {
      "task": "Complete project proposal",
      "dueDate": "2024-01-20",
      "priority": "high"
    }
  ]
}
```

*Note: `recipientName` is automatically populated for each recipient.*

### Follow-up Email

**Type:** `follow-up`

**Data Structure:**
```json
{
  "meetingTitle": "Q4 Planning Meeting",
  "date": "2024-01-15",
  "keyDecisions": [
    "Approved Q4 budget increase",
    "Decided on new product launch date"
  ],
  "nextMeetingDate": "2024-01-22", // Optional
  "additionalNotes": "Additional context..." // Optional
}
```

*Note: `recipientName` is automatically populated for each recipient.*

### Custom Email

**Type:** `custom`

**Data Structure:**
```json
{
  "subject": "Custom Email Subject",
  "content": "Email content with {name} and {email} placeholders",
  "html": "<h1>Optional HTML content</h1>", // Optional
  "customType": "newsletter" // Optional for categorization
}
```

**Available Placeholders:**
- `{name}` - Recipient's name
- `{email}` - Recipient's email address

## Email Templates

### Template Features

- **Responsive Design** - Works on all devices
- **Professional Styling** - Branded with InsightMeet colors
- **Rich Content** - Support for lists, tables, and formatting
- **Personalization** - Automatic name and email substitution
- **Priority Indicators** - Visual priority levels for action items

### Template Types

1. **Meeting Summary Template**
   - Header with meeting title and branding
   - Meeting details (date, duration, participants)
   - Summary section with key points
   - Action items with priority indicators
   - Next steps and attachments
   - Professional footer

2. **Action Item Reminder Template**
   - Urgent styling with attention-grabbing colors
   - Personalized greeting
   - List of pending action items
   - Due dates and priority levels
   - Call-to-action for completion

3. **Follow-up Template**
   - Clean, professional design
   - Key decisions summary
   - Next meeting information
   - Additional notes section
   - Contact information

## Queue Management

### Features

- **Rate Limiting** - Respects Resend's free tier limits (50 emails/minute)
- **Priority Queuing** - High priority emails sent first
- **Retry Logic** - Automatic retry with exponential backoff
- **Scheduling** - Send emails at specific times
- **Bulk Processing** - Efficient handling of multiple emails
- **Status Tracking** - Real-time queue monitoring

### Priority Levels

- **High** - Sent immediately (action reminders, urgent notifications)
- **Medium** - Normal processing (meeting summaries, follow-ups)
- **Low** - Sent when queue is less busy (newsletters, general updates)

### Rate Limits

- **Free Tier:** 3,000 emails/month, ~50 emails/minute
- **Queue Limit:** 50 emails/minute to stay within limits
- **Retry Attempts:** Maximum 3 attempts per email
- **Retry Delay:** 5 seconds between attempts

## Error Handling

### Common Error Codes

- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Invalid or missing API key
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server or service error

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE" // Optional error code
}
```

### Retry Logic

1. **Network Errors** - Automatic retry with exponential backoff
2. **Rate Limits** - Queue delay until limit resets
3. **Invalid Recipients** - Skip invalid emails, continue with valid ones
4. **Service Errors** - Retry up to 3 times, then mark as failed

## Usage Examples

### JavaScript/TypeScript

```javascript
// Send single email
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Meeting Summary',
    body: 'Your meeting summary...'
  })
});

// Send bulk meeting summaries
const bulkResponse = await fetch('/api/send-bulk-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'meeting-summary',
    recipients: [
      'user1@example.com',
      { email: 'user2@example.com', name: 'John Doe' }
    ],
    data: {
      meetingTitle: 'Q4 Planning',
      date: '2024-01-15',
      duration: '2 hours',
      participants: ['John', 'Jane'],
      summary: 'Meeting summary...',
      keyPoints: ['Point 1', 'Point 2'],
      actionItems: [
        {
          task: 'Complete proposal',
          assignee: 'John Doe',
          dueDate: '2024-01-20',
          priority: 'high'
        }
      ]
    },
    options: {
      priority: 'high',
      scheduledAt: '2024-01-15T10:00:00Z'
    }
  })
});

// Check queue status
const statusResponse = await fetch('/api/send-bulk-email');
const status = await statusResponse.json();
console.log('Queue length:', status.data.status.queueLength);
```

### cURL Examples

```bash
# Send single email
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test Email",
    "body": "This is a test email from InsightMeet"
  }'

# Send bulk emails
curl -X POST http://localhost:3000/api/send-bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "recipients": ["user1@example.com", "user2@example.com"],
    "data": {
      "subject": "Bulk Test Email",
      "content": "Hello {name}, this is a test email to {email}"
    },
    "options": {
      "priority": "medium"
    }
  }'

# Check queue status
curl http://localhost:3000/api/send-bulk-email
```

## Best Practices

1. **Validate Recipients** - Always validate email addresses before sending
2. **Use Templates** - Leverage built-in templates for consistent branding
3. **Set Priorities** - Use appropriate priority levels for different email types
4. **Monitor Queue** - Check queue status regularly in production
5. **Handle Errors** - Implement proper error handling and user feedback
6. **Rate Limiting** - Respect API limits to avoid service disruption
7. **Personalization** - Use recipient names and relevant data for better engagement
8. **Testing** - Use the test page (`/test-email`) to verify functionality

## Monitoring and Analytics

### Available Metrics

- Queue length and processing status
- Emails sent per minute/hour/day
- Success and failure rates
- Retry attempts and reasons
- Priority distribution

### Resend Dashboard

Monitor your email usage and delivery rates at:
- **Dashboard:** https://resend.com/emails
- **Analytics:** Delivery rates, bounces, opens (if tracking enabled)
- **Logs:** Detailed sending logs and error messages
- **Usage:** Monthly email count and limits
