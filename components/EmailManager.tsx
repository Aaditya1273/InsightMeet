'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Mail, 
  Send, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Calendar
} from 'lucide-react';

interface Recipient {
  email: string;
  name?: string;
}

interface EmailManagerProps {
  meetingData?: {
    title: string;
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
  };
  className?: string;
}

export function EmailManager({ meetingData, className = '' }: EmailManagerProps) {
  const [emailType, setEmailType] = useState<'meeting-summary' | 'action-reminder' | 'follow-up' | 'custom'>('meeting-summary');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    emailIds?: string[];
  } | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);

  // Initialize recipients from meeting data
  useEffect(() => {
    if (meetingData?.participants) {
      const initialRecipients = meetingData.participants.map(participant => ({
        email: participant.includes('@') ? participant : `${participant}@company.com`,
        name: participant.includes('@') ? participant.split('@')[0] : participant
      }));
      setRecipients(initialRecipients);
    }
  }, [meetingData]);

  // Fetch queue status periodically
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const response = await fetch('/api/send-bulk-email');
        if (response.ok) {
          const data = await response.json();
          setQueueStatus(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const addRecipient = () => {
    if (!newRecipientEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipientEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (recipients.some(r => r.email === newRecipientEmail)) {
      alert('This email is already in the recipient list');
      return;
    }

    setRecipients([...recipients, {
      email: newRecipientEmail,
      name: newRecipientName || newRecipientEmail.split('@')[0]
    }]);

    setNewRecipientEmail('');
    setNewRecipientName('');
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const handleSendEmails = async () => {
    if (recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    if (!meetingData && emailType !== 'custom') {
      alert('Meeting data is required for this email type');
      return;
    }

    if (emailType === 'custom' && (!customSubject || !customContent)) {
      alert('Subject and content are required for custom emails');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let emailData: any = {};
      let subject = customSubject;

      switch (emailType) {
        case 'meeting-summary':
          emailData = {
            meetingTitle: meetingData!.title,
            date: meetingData!.date,
            duration: meetingData!.duration,
            participants: meetingData!.participants,
            summary: meetingData!.summary,
            keyPoints: meetingData!.keyPoints,
            actionItems: meetingData!.actionItems
          };
          subject = subject || `Meeting Summary: ${meetingData!.title}`;
          break;

        case 'action-reminder':
          emailData = {
            meetingTitle: meetingData!.title,
            meetingDate: meetingData!.date,
            actionItems: meetingData!.actionItems.filter(item => 
              recipients.some(r => r.name === item.assignee || r.email.includes(item.assignee))
            )
          };
          subject = subject || `Action Item Reminder: ${meetingData!.title}`;
          break;

        case 'follow-up':
          emailData = {
            meetingTitle: meetingData!.title,
            date: meetingData!.date,
            keyDecisions: meetingData!.keyPoints
          };
          subject = subject || `Follow-up: ${meetingData!.title}`;
          break;

        case 'custom':
          emailData = {
            subject: customSubject,
            content: customContent
          };
          break;
      }

      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: emailType,
          recipients: recipients,
          data: emailData,
          options: {
            subject: subject,
            priority: priority,
            scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined
          }
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        setResult({
          success: true,
          message: responseData.message,
          emailIds: responseData.data.emailIds
        });
        setQueueStatus(responseData.data.queueStatus);
      } else {
        setResult({
          success: false,
          message: responseData.error || 'Failed to send emails'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Network error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEmailTypeDescription = () => {
    switch (emailType) {
      case 'meeting-summary':
        return 'Send a comprehensive meeting summary with key points and action items';
      case 'action-reminder':
        return 'Send personalized reminders to assignees about their action items';
      case 'follow-up':
        return 'Send a follow-up email with key decisions and next steps';
      case 'custom':
        return 'Send a custom email with your own content';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Queue Status */}
      {queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Email Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-600">Queue Length</div>
                <div className="text-2xl font-bold">{queueStatus.status.queueLength}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Processing</div>
                <div className={`text-2xl font-bold ${queueStatus.status.processing ? 'text-green-600' : 'text-gray-400'}`}>
                  {queueStatus.status.processing ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Sent This Minute</div>
                <div className="text-2xl font-bold">{queueStatus.status.sentThisMinute}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Rate Limit</div>
                <div className="text-2xl font-bold">{queueStatus.status.rateLimitPerMinute}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Email Type</CardTitle>
          <CardDescription>{getEmailTypeDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'meeting-summary', label: 'Meeting Summary', icon: '📋' },
              { value: 'action-reminder', label: 'Action Reminder', icon: '⏰' },
              { value: 'follow-up', label: 'Follow-up', icon: '💬' },
              { value: 'custom', label: 'Custom Email', icon: '✉️' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setEmailType(type.value as any)}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  emailType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-sm">{type.label}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipients ({recipients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Recipient */}
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={newRecipientEmail}
              onChange={(e) => setNewRecipientEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
            />
            <Input
              placeholder="Name (optional)"
              value={newRecipientName}
              onChange={(e) => setNewRecipientName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
            />
            <Button onClick={addRecipient} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div>
                    <div className="font-medium">{recipient.name}</div>
                    <div className="text-sm text-gray-600">{recipient.email}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRecipient(recipient.email)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Email Content */}
      {emailType === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Email content... Use {name} and {email} as placeholders"
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Options */}
      <Card>
        <CardHeader>
          <CardTitle>Email Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <Label htmlFor="scheduled">Schedule Send (Optional)</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSendEmails} 
          disabled={isLoading || recipients.length === 0}
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Queueing Emails...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send {recipients.length} Email{recipients.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{result.message}</span>
            </div>
            {result.emailIds && (
              <div className="mt-2 text-sm text-gray-600">
                Email IDs: {result.emailIds.slice(0, 3).join(', ')}
                {result.emailIds.length > 3 && ` and ${result.emailIds.length - 3} more`}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
