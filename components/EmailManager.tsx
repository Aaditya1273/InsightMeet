import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Loader2, 
  Plus, 
  X, 
  Send, 
  Clock, 
  Calendar, 
  FileText, 
  Eye, 
  Save, 
  Upload, 
  Download, 
  Copy, 
  Check,
  AlertCircle,
  Users,
  Paperclip,
  Palette,
  Zap,
  BarChart3,
  Shield,
  Globe,
  Sparkles
} from 'lucide-react';

// Enhanced interfaces
interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string | ArrayBuffer;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
}

interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

interface EmailSendProps {
  defaultEmail?: string;
  defaultSubject?: string;
  defaultContent?: string;
  onSend?: (emailData: EmailData) => Promise<void>;
  className?: string;
  enableScheduling?: boolean;
  enableTemplates?: boolean;
  enableTracking?: boolean;
  enableBulkSend?: boolean;
  enableAttachments?: boolean;
  enableRichText?: boolean;
  maxAttachmentSize?: number;
  allowedFileTypes?: string[];
  templates?: EmailTemplate[];
  onSaveTemplate?: (template: EmailTemplate) => void;
  onTrackingEvent?: (event: string, data: any) => void;
}

interface EmailData {
  recipients: EmailRecipient[];
  subject: string;
  content: string;
  htmlContent?: string;
  attachments?: EmailAttachment[];
  scheduledTime?: Date;
  priority: 'low' | 'normal' | 'high';
  trackOpens: boolean;
  trackClicks: boolean;
  replyTo?: string;
  tags: string[];
  customHeaders?: Record<string, string>;
}

interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    name: 'Meeting Summary',
    subject: 'Meeting Summary - {{date}}',
    content: 'Hi {{name}},\n\nHere\'s the summary of our meeting:\n\n{{content}}\n\nBest regards,\n{{sender}}',
    category: 'Business',
    variables: ['date', 'name', 'content', 'sender']
  },
  {
    id: '2',
    name: 'Follow-up',
    subject: 'Follow-up: {{topic}}',
    content: 'Hi {{name}},\n\nI wanted to follow up on {{topic}}.\n\n{{message}}\n\nLet me know if you have any questions.\n\nBest regards,\n{{sender}}',
    category: 'Business',
    variables: ['topic', 'name', 'message', 'sender']
  },
  {
    id: '3',
    name: 'Thank You',
    subject: 'Thank you for {{reason}}',
    content: 'Dear {{name}},\n\nThank you for {{reason}}. Your {{contribution}} was greatly appreciated.\n\n{{additional_message}}\n\nWarm regards,\n{{sender}}',
    category: 'Personal',
    variables: ['reason', 'name', 'contribution', 'additional_message', 'sender']
  }
];

export function EmailSend({
  defaultEmail = '',
  defaultSubject = 'Meeting Summary',
  defaultContent = '',
  onSend,
  className = '',
  enableScheduling = true,
  enableTemplates = true,
  enableTracking = true,
  enableBulkSend = true,
  enableAttachments = true,
  enableRichText = true,
  maxAttachmentSize = 25 * 1024 * 1024, // 25MB
  allowedFileTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
  templates = EMAIL_TEMPLATES,
  onSaveTemplate,
  onTrackingEvent,
}: EmailSendProps) {
  // Core state
  const [recipients, setRecipients] = useState<EmailRecipient[]>([
    { email: defaultEmail, type: 'to' }
  ]);
  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState(defaultContent);
  const [htmlContent, setHtmlContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [replyTo, setReplyTo] = useState('');
  
  // Feature states
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [isRichText, setIsRichText] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState('compose');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Template states
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  // Stats
  const [emailStats, setEmailStats] = useState<EmailStats>({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout>();
  
  // Auto-save functionality
  useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    
    autoSaveRef.current = setTimeout(() => {
      if (content || subject) {
        const draftData = {
          recipients,
          subject,
          content,
          htmlContent,
          priority,
          tags,
          attachments: attachments.map(att => ({ ...att, data: null })) // Don't save file data
        };
        localStorage.setItem('emailDraft', JSON.stringify(draftData));
      }
    }, 2000);
    
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [recipients, subject, content, htmlContent, priority, tags, attachments]);
  
  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('emailDraft');
    if (savedDraft && !defaultContent && !defaultSubject) {
      try {
        const draftData = JSON.parse(savedDraft);
        setRecipients(draftData.recipients || []);
        setSubject(draftData.subject || '');
        setContent(draftData.content || '');
        setHtmlContent(draftData.htmlContent || '');
        setPriority(draftData.priority || 'normal');
        setTags(draftData.tags || []);
        setSuccess('Draft loaded successfully');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);
  
  // Enhanced validation
  const validateForm = useCallback((): string | null => {
    if (recipients.length === 0 || !recipients[0].email) {
      return 'At least one recipient is required';
    }
    
    for (const recipient of recipients) {
      if (!/^\S+@\S+\.\S+$/.test(recipient.email)) {
        return `Invalid email address: ${recipient.email}`;
      }
    }
    
    if (!subject.trim()) {
      return 'Subject is required';
    }
    
    if (!content.trim() && !htmlContent.trim()) {
      return 'Content is required';
    }
    
    if (attachments.length > 0) {
      const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
      if (totalSize > maxAttachmentSize) {
        return `Total attachment size exceeds ${Math.round(maxAttachmentSize / 1024 / 1024)}MB limit`;
      }
    }
    
    if (scheduledTime && scheduledTime <= new Date()) {
      return 'Scheduled time must be in the future';
    }
    
    return null;
  }, [recipients, subject, content, htmlContent, attachments, scheduledTime, maxAttachmentSize]);
  
  // Enhanced send function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      setProgress(0);
      
      const emailData: EmailData = {
        recipients,
        subject,
        content: isRichText ? htmlContent : content,
        htmlContent: isRichText ? htmlContent : undefined,
        attachments,
        scheduledTime: scheduledTime || undefined,
        priority,
        trackOpens,
        trackClicks,
        replyTo: replyTo || undefined,
        tags,
        customHeaders: {
          'X-Email-Client': 'Enhanced-EmailSend',
          'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3'
        }
      };
      
      if (onSend) {
        await onSend(emailData);
      } else {
        // Simulate progress for multiple recipients
        const totalRecipients = recipients.length;
        for (let i = 0; i < totalRecipients; i++) {
          const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...emailData,
              recipients: [recipients[i]]
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send email');
          }
          
          setProgress(((i + 1) / totalRecipients) * 100);
          
          // Update stats
          setEmailStats(prev => ({
            ...prev,
            sent: prev.sent + 1
          }));
        }
      }
      
      setIsSent(true);
      setSuccess(scheduledTime ? 'Email scheduled successfully!' : 'Email sent successfully!');
      
      // Clear draft
      localStorage.removeItem('emailDraft');
      
      // Track event
      if (onTrackingEvent) {
        onTrackingEvent('email_sent', {
          recipients: recipients.length,
          hasAttachments: attachments.length > 0,
          isScheduled: !!scheduledTime,
          priority
        });
      }
      
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email. Please try again.');
      setEmailStats(prev => ({
        ...prev,
        failed: prev.failed + 1
      }));
    } finally {
      setIsSending(false);
    }
  };
  
  // Template functions
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setSubject(template.subject);
    setContent(template.content);
    setSelectedTemplate(templateId);
    
    // Extract variables from template
    const variables: Record<string, string> = {};
    template.variables.forEach(variable => {
      variables[variable] = '';
    });
    setTemplateVariables(variables);
  };
  
  const processTemplate = (text: string, variables: Record<string, string>): string => {
    let processedText = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedText = processedText.replace(regex, value);
    });
    return processedText;
  };
  
  const saveTemplate = () => {
    if (!newTemplateName.trim()) {
      setError('Template name is required');
      return;
    }
    
    const template: EmailTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      subject,
      content,
      category: 'Custom',
      variables: []
    };
    
    if (onSaveTemplate) {
      onSaveTemplate(template);
    }
    
    setNewTemplateName('');
    setSaveAsTemplate(false);
    setSuccess('Template saved successfully!');
  };
  
  // Recipient management
  const addRecipient = (email: string, type: 'to' | 'cc' | 'bcc' = 'to') => {
    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      setRecipients(prev => [...prev, { email, type }]);
    }
  };
  
  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };
  
  const processBulkEmails = () => {
    const emails = bulkEmails.split('\n').filter(email => email.trim());
    const validEmails = emails.filter(email => /^\S+@\S+\.\S+$/.test(email.trim()));
    
    validEmails.forEach(email => {
      addRecipient(email.trim());
    });
    
    setBulkEmails('');
    setSuccess(`Added ${validEmails.length} recipients`);
  };
  
  // File handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.size > maxAttachmentSize) {
        setError(`File ${file.name} exceeds ${Math.round(maxAttachmentSize / 1024 / 1024)}MB limit`);
        return;
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension && !allowedFileTypes.includes(fileExtension)) {
        setError(`File type ${fileExtension} is not allowed`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: EmailAttachment = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target?.result as string
        };
        
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };
  
  // Tag management
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };
  
  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Success state
  if (isSent) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {scheduledTime ? 'Email Scheduled!' : 'Email Sent Successfully!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {scheduledTime 
                ? `Your email will be sent on ${scheduledTime.toLocaleString()}`
                : `Your email has been sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`
              }
            </p>
            
            {showStats && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Delivery Statistics</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{emailStats.sent}</div>
                    <div className="text-gray-600">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{emailStats.delivered}</div>
                    <div className="text-gray-600">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{emailStats.failed}</div>
                    <div className="text-gray-600">Failed</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSent(false);
                  setRecipients([{ email: '', type: 'to' }]);
                  setSubject('');
                  setContent('');
                  setHtmlContent('');
                  setAttachments([]);
                  setScheduledTime(null);
                  setTags([]);
                  setError(null);
                  setSuccess(null);
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Another
              </Button>
              
              <Button
                variant="outline"
                onClick={() => copyToClipboard(content)}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Content'}
              </Button>
              
              {enableTracking && (
                <Button
                  variant="outline"
                  onClick={() => setShowStats(!showStats)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showStats ? 'Hide' : 'Show'} Stats
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-xl">Enhanced Email Composer</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Secure
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="compose">
              <FileText className="w-4 h-4 mr-2" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Users className="w-4 h-4 mr-2" />
              Recipients
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Save className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Palette className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit} className="mt-6">
            <TabsContent value="compose" className="space-y-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center">
                  Subject *
                  <Badge className={`ml-2 ${getPriorityColor(priority)}`}>
                    {priority}
                  </Badge>
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  required
                />
              </div>
              
              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content *</Label>
                  <div className="flex items-center space-x-2">
                    {enableRichText && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="richtext" className="text-sm">Rich Text</Label>
                        <Switch
                          id="richtext"
                          checked={isRichText}
                          onCheckedChange={setIsRichText}
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                </div>
                
                {previewMode ? (
                  <div className="border rounded-lg p-4 min-h-[200px] bg-gray-50">
                    <div className="whitespace-pre-wrap">
                      {selectedTemplate && Object.keys(templateVariables).length > 0
                        ? processTemplate(content, templateVariables)
                        : content
                      }
                    </div>
                  </div>
                ) : (
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your email content..."
                    rows={12}
                    required
                  />
                )}
              </div>
              
              {/* Template Variables */}
              {selectedTemplate && Object.keys(templateVariables).length > 0 && (
                <div className="space-y-2">
                  <Label>Template Variables</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(templateVariables).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-sm">{key}</Label>
                        <Input
                          value={value}
                          onChange={(e) => setTemplateVariables(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          placeholder={`Enter ${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Attachments */}
              {enableAttachments && (
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept={allowedFileTypes.map(type => `.${type}`).join(',')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Add Attachment
                    </Button>
                    <span className="text-sm text-gray-500">
                      Max {Math.round(maxAttachmentSize / 1024 / 1024)}MB per file
                    </span>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{attachment.name}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recipients" className="space-y-4">
              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={recipient.email}
                      onChange={(e) => {
                        const newRecipients = [...recipients];
                        newRecipients[index].email = e.target.value;
                        setRecipients(newRecipients);
                      }}
                      placeholder="recipient@example.com"
                      className="flex-1"
                    />
                    <Select
                      value={recipient.type}
                      onValueChange={(value: 'to' | 'cc' | 'bcc') => {
                        const newRecipients = [...recipients];
                        newRecipients[index].type = value;
                        setRecipients(newRecipients);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to">To</SelectItem>
                        <SelectItem value="cc">CC</SelectItem>
                        <SelectItem value="bcc">BCC</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addRecipient('')}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
              
              {/* Bulk Email Import */}
              {enableBulkSend && (
                <div className="space-y-2">
                  <Label>Bulk Import</Label>
                  <Textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="Enter multiple email addresses (one per line)..."
                    rows={4}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={processBulkEmails}
                    disabled={!bulkEmails.trim()}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Import Emails
                  </Button>
                </div>
              )}
              
              {/* Reply To */}
              <div className="space-y-2">
                <Label htmlFor="replyTo">Reply-To Address</Label>
                <Input
                  id="replyTo"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="reply@example.com"
                  type="email"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Choose Template</Label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{template.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {template.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Template Preview */}
              {selectedTemplate && (
                <div className="space-y-2">
                  <Label>Template Preview</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-2">
                      Subject: {templates.find(t => t.id === selectedTemplate)?.subject}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {templates.find(t => t.id === selectedTemplate)?.content}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Save as Template */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="saveTemplate"
                    checked={saveAsTemplate}
                    onCheckedChange={setSaveAsTemplate}
                  />
                  <Label htmlFor="saveTemplate">Save current content as template</Label>
                </div>
                
                {saveAsTemplate && (
                  <div className="flex space-x-2">
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveTemplate}
                      disabled={!newTemplateName.trim()}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(value: 'low' | 'normal' | 'high') => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Scheduling */}
              {enableScheduling && (
                <div className="space-y-2">
                  <Label>Schedule Email</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="datetime-local"
                      value={scheduledTime ? scheduledTime.toISOString().slice(0, 16) : ''}
                      onChange={(e) => setScheduledTime(e.target.value ? new Date(e.target.value) : null)}
                    />
                    {scheduledTime && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScheduledTime(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tracking Options */}
              {enableTracking && (
                <div className="space-y-3">
                  <Label>Tracking Options</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="trackOpens"
                        checked={trackOpens}
                        onCheckedChange={setTrackOpens}
                      />
                      <Label htmlFor="trackOpens" className="text-sm">Track Opens</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="trackClicks"
                        checked={trackClicks}
                        onCheckedChange={setTrackClicks}
                      />
                      <Label htmlFor="trackClicks" className="text-sm">Track Clicks</Label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Email Stats Preview */}
              {enableTracking && (
                <div className="space-y-2">
                  <Label>Campaign Statistics</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{emailStats.sent}</div>
                      <div className="text-sm text-blue-700">Emails Sent</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{emailStats.delivered}</div>
                      <div className="text-sm text-green-700">Delivered</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{emailStats.opened}</div>
                      <div className="text-sm text-yellow-700">Opened</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{emailStats.failed}</div>
                      <div className="text-sm text-red-700">Failed</div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Error and Success Messages */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-700">{success}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuccess(null)}
                  className="ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Progress Bar */}
            {isSending && progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sending emails...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyToClipboard(content)}
                  disabled={!content.trim()}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `email-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={!content.trim()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <span className="text-sm text-gray-500">
                  {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                  {attachments.length > 0 && ` • ${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRecipients([{ email: '', type: 'to' }]);
                    setSubject('');
                    setContent('');
                    setHtmlContent('');
                    setAttachments([]);
                    setScheduledTime(null);
                    setTags([]);
                    setSelectedTemplate('');
                    setTemplateVariables({});
                    setError(null);
                    setSuccess(null);
                    localStorage.removeItem('emailDraft');
                  }}
                >
                  Clear All
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSending || !recipients[0]?.email || !subject.trim() || !content.trim()}
                  className="min-w-[120px]"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : scheduledTime ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default EmailSend;