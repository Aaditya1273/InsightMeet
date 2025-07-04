'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SummaryView } from '@/components/SummaryView';
import { Button } from '@/components/ui/button';
import { Download, Mail, Calendar as CalendarIcon } from 'lucide-react';

// This type now matches the strict structure expected by the child components.
type AnalysisResult = {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    id: string; // Now required
    task: string;
    assignee: string; // Now required
    dueDate: string; // Now required
    completed: boolean; // Now required
  }>;
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const fileKey = searchParams.get('fileKey');
  const [summary, setSummary] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!fileKey) {
        setError('No file key provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileKey }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Response:", errorText);
            let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
            try {
                // If the API returns a structured JSON error, use its message
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.details || errorJson.error || errorMessage;
            } catch (e) {
                // If it's not JSON, it's likely an HTML error page.
                // The console log above is the most useful for debugging.
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();

        // Transform data to ensure it matches the strict structure expected by components.
        const transformedData: AnalysisResult = {
            ...data,
            actionItems: data.actionItems.map((item: any, index: number) => ({
                task: item.task || 'Unnamed Task',
                assignee: item.assignee || 'Unassigned',
                dueDate: item.dueDate || 'N/A',
                id: item.id || `action-item-${index}`,
                completed: item.completed === true, // Ensure it's a boolean
            })),
        };

        setSummary(transformedData);

      } catch (err) {
        console.error('Error fetching summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [fileKey]);

  const handleExportPDF = () => {
    // This would be implemented using a PDF generation library
    // console.log('Exporting to PDF');
    alert('PDF export functionality will be implemented here');
  };

  const handleSendEmail = async (email: string, subject: string, content: string) => {
    setIsSendingEmail(true);
    try {
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      alert('Email sent successfully!');
      setShowEmailForm(false); // Hide form on success
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
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
            onClick={() => setShowEmailForm(true)}
            disabled={isSendingEmail}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSendingEmail ? 'Sending...' : 'Send Email'}
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
