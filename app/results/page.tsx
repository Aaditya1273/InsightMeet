'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SummaryView } from '@/components/SummaryView';
import { Button } from '@/components/ui/button';
import { Download, Mail, Calendar as CalendarIcon } from 'lucide-react';

// Mock data type - replace with your actual data structure
type MeetingSummary = {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    completed: boolean;
  }>;
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // In a real app, you would fetch the summary from your API
        // const response = await fetch(`/api/summary/${sessionId}`);
        // const data = await response.json();
        
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const mockData: MeetingSummary = {
          id: sessionId,
          title: 'Team Sync Meeting',
          date: new Date().toLocaleDateString(),
          duration: '1 hour',
          participants: ['john@example.com', 'jane@example.com'],
          summary: 'The team discussed the current project status and upcoming deadlines. Key decisions were made regarding the implementation approach for the new features.',
          keyPoints: [
            'Project is on track for the Q1 release',
            'New feature implementation will start next week',
            'Code review process was updated to include additional checks'
          ],
          actionItems: [
            {
              id: '1',
              task: 'Update project timeline with new deadlines',
              assignee: 'john@example.com',
              dueDate: '2023-06-15',
              completed: false
            },
            {
              id: '2',
              task: 'Prepare demo for the new features',
              assignee: 'jane@example.com',
              dueDate: '2023-06-20',
              completed: false
            }
          ]
        };
        
        setSummary(mockData);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError('Failed to load meeting summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId]);

  const handleExportPDF = () => {
    // This would be implemented using a PDF generation library
    console.log('Exporting to PDF');
    alert('PDF export functionality will be implemented here');
  };

  const handleSendEmail = async (email: string, subject: string, content: string) => {
    try {
      setIsSendingEmail(true);
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setShowEmailForm(false);
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExportICS = async () => {
    if (!summary) return;
    
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: summary.title,
          description: summary.summary,
          startTime: new Date().toISOString(),
          duration: 1, // Default to 1 hour
          attendees: summary.participants,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate calendar event');
      }

      // Create a download link for the ICS file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting to calendar:', err);
      setError('Failed to export to calendar. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating your meeting summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-muted/50 border rounded-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No meeting summary found</h2>
          <p className="text-muted-foreground mb-4">We couldn't find a meeting summary for this session.</p>
          <Button onClick={() => window.location.href = '/'}>
            Start a New Meeting
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meeting Summary</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowEmailForm(!showEmailForm)}
            disabled={isSendingEmail}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSendingEmail ? 'Sending...' : 'Email Summary'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportICS}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Add to Calendar
          </Button>
        </div>
      </div>

      {showEmailForm && (
        <div className="mb-8 p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Email Meeting Summary</h2>
          <div className="max-w-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  To
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={summary.participants.join(', ')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Meeting Summary"
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={`Meeting Summary: ${summary.title}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Message
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={`Hello,

Here's the summary of our meeting:

${summary.summary}

Key Points:
${summary.keyPoints.map(point => `• ${point}`).join('\n')}

Action Items:
${summary.actionItems.map(item => `- ${item.task} (${item.assignee} - Due: ${item.dueDate})`).join('\n')}

Best regards,
[Your Name]`}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isSendingEmail}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value;
                    const subject = (document.querySelector('input[type="text"]') as HTMLInputElement)?.value;
                    const content = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                    if (email && subject && content) {
                      handleSendEmail(email, subject, content);
                    }
                  }}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SummaryView
        data={summary}
        onExportPDF={handleExportPDF}
        onSendEmail={() => setShowEmailForm(true)}
        onExportICS={handleExportICS}
      />
    </div>
  );
}
