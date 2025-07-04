'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    completed: boolean;
  }>;
};

export default function ResultsPage() {
  const router = useRouter();
  const { fileKey } = useParams();
  const [summaryData, setSummaryData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileKey }),
        });

        if (!response.ok) {
          const html = await response.text();
          console.error("API Error Response:", html);
          throw new Error("Request failed: " + response.status + " " + response.statusText);
        }

        const data = await response.json();
        console.log("✅ Summary:", data);
        setSummaryData(data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching summaryData:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch summaryData');
        setLoading(false);
      }
    };

    if (fileKey) {
      fetchSummary();
    } else {
      setError('No file key provided');
      setLoading(false);
    }
  }, [fileKey]);

  useEffect(() => {
    if (summaryData && showEmailForm) {
      setEmailTo(summaryData.participants?.join(', ') || '');
      setEmailSubject(summaryData.title ? `Meeting Summary: ${summaryData.title}` : 'Meeting Summary');
      setEmailBody(`Hello,

Here's the summary of our meeting:

${summaryData.summary}

Key Points:
${summaryData.keyPoints.map(point => `• ${point}`).join('\n')}

Action Items:
${summaryData.actionItems.map(item => `- ${item.task} (${item.assignee} - Due: ${item.dueDate})`).join('\n')}

Best regards,
[Your Name]`);
    }
  }, [summaryData, showEmailForm]);

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
    if (!summaryData) return;
    
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: summaryData.title,
          description: summaryData.summary,
          // Use the actual meeting date. Assumes summaryData.date is a valid date string.
          startTime: new Date(summaryData.date).toISOString(),
          duration: 1, // TODO: Parse duration from summaryData.duration string.
          attendees: summaryData.participants,
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
      a.download = `${summaryData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting to calendar:', err);
      setError('Failed to export to calendar. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating your meeting summaryData...</p>
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
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-muted/50 border rounded-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No meeting summaryData found</h2>
          <p className="text-muted-foreground mb-4">We couldn't find a meeting summaryData for this session.</p>
          <Button onClick={() => router.push('/')}>
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
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Meeting Summary"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Message
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
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
                    if (emailTo && emailSubject && emailBody) {
                      handleSendEmail(emailTo, emailSubject, emailBody);
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
        data={summaryData}
        onExportPDF={handleExportPDF}
        onSendEmail={() => setShowEmailForm(true)}
        onExportICS={handleExportICS}
      />
    </div>
  );
}
