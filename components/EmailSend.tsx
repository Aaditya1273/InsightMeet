import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Mail, Loader2 } from 'lucide-react';

type EmailSendProps = {
  defaultEmail?: string;
  defaultSubject?: string;
  defaultContent?: string;
  onSend?: (email: string, subject: string, content: string) => Promise<void>;
  className?: string;
};

export function EmailSend({
  defaultEmail = '',
  defaultSubject = 'Meeting Summary',
  defaultContent = '',
  onSend,
  className = '',
}: EmailSendProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState(defaultContent);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!content) {
      setError('Content is required');
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
      if (onSend) {
        await onSend(email, subject, content);
      } else {
        // Default implementation using the API route
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: email, subject, content }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send email');
        }
      }
      
      setIsSent(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <div className="rounded-lg border bg-green-50 p-4 text-green-800">
        <div className="flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          <span>Email sent successfully!</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="email">Recipient Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Meeting Summary"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content">Message</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Meeting summary content..."
          rows={8}
          required
        />
      </div>
      
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
