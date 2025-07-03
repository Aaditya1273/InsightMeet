'use client';

import { useState } from 'react';
import { EmailSend } from '../../components/EmailSend';
import { EmailManager } from '../../components/EmailManager';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react';

export default function TestEmailPage() {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test data
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testSubject, setTestSubject] = useState('Test Email from InsightMeet');
  const [testBody, setTestBody] = useState(`Hello!

This is a test email from InsightMeet to verify that the email functionality is working correctly.

Meeting Summary:
- Discussed project timeline
- Reviewed budget allocation
- Assigned action items to team members

Action Items:
1. Complete design mockups by Friday
2. Set up development environment
3. Schedule next team meeting

Best regards,
InsightMeet Team`);

  const handleDirectAPITest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          body: testBody,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: 'Email sent successfully!',
          data: result.data,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to send email',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Network error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponentTest = async (email: string, subject: string, content: string) => {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: subject,
        body: content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    return response.json();
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Email Functionality Test</h1>
        <p className="text-gray-600">
          Test the InsightMeet email functionality using Resend API
        </p>
      </div>

      {/* API Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration Status
          </CardTitle>
          <CardDescription>
            Check if the email service is properly configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Resend package installed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>API routes configured</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Email components ready</span>
            </div>
            <div className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_APP_URL ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Environment variables (check .env.local for RESEND_API_KEY)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Direct API Test</CardTitle>
          <CardDescription>
            Test the /api/send-email endpoint directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-subject">Subject</Label>
              <Input
                id="test-subject"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="test-body">Email Body</Label>
            <Textarea
              id="test-body"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={8}
              placeholder="Email content..."
            />
          </div>

          <Button 
            onClick={handleDirectAPITest} 
            disabled={isLoading || !testEmail}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Test Email...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
              {testResult.data && (
                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Test */}
      <Card>
        <CardHeader>
          <CardTitle>Email Component Test</CardTitle>
          <CardDescription>
            Test the EmailSend component with pre-filled meeting summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailSend
            defaultEmail=""
            defaultSubject="Meeting Summary - Project Kickoff"
            defaultContent={`Hi there!

Here's the summary from our project kickoff meeting:

## Meeting Summary
**Date:** ${new Date().toLocaleDateString()}
**Duration:** 1 hour
**Attendees:** 5 team members

## Key Discussion Points
- Project scope and objectives
- Timeline and milestones
- Resource allocation
- Risk assessment

## Action Items
1. **John Doe** - Prepare technical specifications (Due: Next Friday)
2. **Jane Smith** - Set up project repository (Due: This Thursday)
3. **Team Lead** - Schedule weekly check-ins (Due: Tomorrow)

## Next Steps
- Review and approve project charter
- Begin development phase
- Schedule next team meeting for progress review

Best regards,
InsightMeet Team

---
This summary was generated automatically by InsightMeet.`}
            onSend={handleComponentTest}
          />
        </CardContent>
      </Card>

      {/* Advanced Email Manager Test */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Email Manager</CardTitle>
          <CardDescription>
            Test the new EmailManager component with bulk sending and templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailManager
            meetingData={{
              title: "Q4 Planning Meeting",
              date: new Date().toLocaleDateString(),
              duration: "2 hours",
              participants: ["john.doe@company.com", "jane.smith@company.com", "team.lead@company.com"],
              summary: "We discussed Q4 objectives, budget allocation, and resource planning. Key decisions were made regarding project priorities and timeline adjustments.",
              keyPoints: [
                "Q4 budget approved with 15% increase",
                "New hiring plan for 3 additional developers",
                "Product launch moved to December",
                "Marketing campaign budget allocated"
              ],
              actionItems: [
                {
                  task: "Finalize Q4 budget spreadsheet",
                  assignee: "john.doe@company.com",
                  dueDate: "2024-01-15",
                  priority: "high"
                },
                {
                  task: "Create job postings for developer positions",
                  assignee: "jane.smith@company.com",
                  dueDate: "2024-01-20",
                  priority: "medium"
                },
                {
                  task: "Schedule product launch planning meeting",
                  assignee: "team.lead@company.com",
                  dueDate: "2024-01-10",
                  priority: "high"
                }
              ]
            }}
          />
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            How to configure the email functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Get Resend API Key</h3>
            <p className="text-sm text-gray-600">
              Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a> and get your API key (free tier: 3,000 emails/month)
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">2. Configure Environment Variables</h3>
            <p className="text-sm text-gray-600">
              Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root:
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
RESEND_API_KEY=re_your_actual_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Verify Domain (Optional)</h3>
            <p className="text-sm text-gray-600">
              For production, verify your domain in Resend dashboard to send from your own domain
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
