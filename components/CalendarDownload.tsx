'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Calendar, 
  Download, 
  Clock, 
  MapPin, 
  Users, 
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface CalendarEvent {
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  attendees?: string[];
  allDay?: boolean;
  reminder?: number;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  url?: string;
}

interface CalendarDownloadProps {
  // Pre-filled event data (optional)
  defaultEvent?: Partial<CalendarEvent>;
  // Multiple events for bulk download
  events?: CalendarEvent[];
  // Component mode
  mode?: 'single' | 'bulk' | 'form';
  // Custom styling
  className?: string;
  // Callback when download starts
  onDownloadStart?: () => void;
  // Callback when download completes
  onDownloadComplete?: (success: boolean, filename?: string) => void;
}

export function CalendarDownload({
  defaultEvent,
  events,
  mode = 'form',
  className = '',
  onDownloadStart,
  onDownloadComplete
}: CalendarDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for single event
  const [eventData, setEventData] = useState<CalendarEvent>({
    title: defaultEvent?.title || '',
    description: defaultEvent?.description || '',
    startTime: defaultEvent?.startTime || '',
    endTime: defaultEvent?.endTime || '',
    duration: defaultEvent?.duration || 1,
    location: defaultEvent?.location || '',
    attendees: defaultEvent?.attendees || [],
    allDay: defaultEvent?.allDay || false,
    reminder: defaultEvent?.reminder || 30,
    priority: defaultEvent?.priority || 'medium',
    category: defaultEvent?.category || 'meeting',
    url: defaultEvent?.url || ''
  });

  // State for managing attendees
  const [newAttendee, setNewAttendee] = useState('');

  const addAttendee = () => {
    if (!newAttendee.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendee)) {
      setError('Please enter a valid email address');
      return;
    }

    if (eventData.attendees?.includes(newAttendee)) {
      setError('This attendee is already added');
      return;
    }

    setEventData(prev => ({
      ...prev,
      attendees: [...(prev.attendees || []), newAttendee]
    }));
    setNewAttendee('');
    setError(null);
  };

  const removeAttendee = (email: string) => {
    setEventData(prev => ({
      ...prev,
      attendees: prev.attendees?.filter(attendee => attendee !== email) || []
    }));
  };

  const downloadSingleEvent = async (event: CalendarEvent) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      onDownloadStart?.();

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate calendar event');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'event.ics';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Calendar event "${event.title}" downloaded successfully!`);
      onDownloadComplete?.(true, filename);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to download calendar event';
      setError(errorMessage);
      onDownloadComplete?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBulkEvents = async (eventList: CalendarEvent[], calendarName?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      onDownloadStart?.();

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventList,
          calendarName: calendarName || 'InsightMeet Events'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate calendar events');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'events.ics';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Calendar with ${eventList.length} events downloaded successfully!`);
      onDownloadComplete?.(true, filename);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to download calendar events';
      setError(errorMessage);
      onDownloadComplete?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventData.title || !eventData.startTime) {
      setError('Title and start time are required');
      return;
    }

    downloadSingleEvent(eventData);
  };

  const handleQuickDownload = () => {
    if (mode === 'single' && defaultEvent) {
      downloadSingleEvent(defaultEvent as CalendarEvent);
    } else if (mode === 'bulk' && events) {
      downloadBulkEvents(events);
    }
  };

  // Quick download button for pre-configured events
  if (mode === 'single' || mode === 'bulk') {
    return (
      <div className={className}>
        <Button
          onClick={handleQuickDownload}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {isLoading 
            ? 'Generating...' 
            : `Download ${mode === 'bulk' ? `${events?.length} Events` : 'Event'}`
          }
        </Button>
        
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}
      </div>
    );
  }

  // Full form interface
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create Calendar Event
        </CardTitle>
        <CardDescription>
          Generate a downloadable calendar invite (.ics file) for your meeting or event
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Basic Event Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={eventData.title}
                onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting agenda, notes, or additional details"
                rows={3}
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={eventData.startTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={eventData.endTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, endTime: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use duration instead
                </p>
              </div>
            </div>

            {!eventData.endTime && (
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={eventData.duration}
                  onChange={(e) => setEventData(prev => ({ ...prev, duration: parseFloat(e.target.value) }))}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allDay"
                checked={eventData.allDay}
                onChange={(e) => setEventData(prev => ({ ...prev, allDay: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="allDay">All day event</Label>
            </div>
          </div>

          {/* Location and Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Meeting room, address, or online link"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="url">Meeting URL</Label>
              <Input
                id="url"
                type="url"
                value={eventData.url}
                onChange={(e) => setEventData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://zoom.us/j/123456789"
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-4">
            <Label>Attendees</Label>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={newAttendee}
                  onChange={(e) => setNewAttendee(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                  placeholder="attendee@example.com"
                  className="pl-10"
                />
              </div>
              <Button type="button" onClick={addAttendee} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {eventData.attendees && eventData.attendees.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {eventData.attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{attendee}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAttendee(attendee)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={eventData.priority}
                onChange={(e) => setEventData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={eventData.category}
                onChange={(e) => setEventData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="meeting">Meeting</option>
                <option value="appointment">Appointment</option>
                <option value="reminder">Reminder</option>
                <option value="deadline">Deadline</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reminder">Reminder (minutes)</Label>
              <Input
                id="reminder"
                type="number"
                min="0"
                value={eventData.reminder}
                onChange={(e) => setEventData(prev => ({ ...prev, reminder: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Calendar Event...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Calendar Event
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
