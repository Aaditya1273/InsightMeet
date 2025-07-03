'use client';

import { useState } from 'react';
import { CalendarDownload } from './CalendarDownload';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus,
  Download,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  generateMeetingCalendarPackage,
  generateFollowUpMeeting,
  generateActionItemReminders,
  type MeetingData,
  type CalendarEvent
} from '../lib/calendar/calendarUtils';
import { addDays } from 'date-fns';

interface MeetingCalendarActionsProps {
  meetingData: {
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
    location?: string;
    meetingUrl?: string;
  };
  className?: string;
}

export function MeetingCalendarActions({ meetingData, className = '' }: MeetingCalendarActionsProps) {
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    type: string;
    success: boolean;
    filename?: string;
  } | null>(null);

  const handleQuickDownload = async (type: 'followup' | 'reminders' | 'package') => {
    try {
      let events: CalendarEvent[] = [];
      let filename = '';

      switch (type) {
        case 'followup':
          const followUpDate = addDays(new Date(), 7); // 1 week from now
          events = [generateFollowUpMeeting(meetingData, followUpDate, 1)];
          filename = 'follow_up_meeting.ics';
          break;
        
        case 'reminders':
          events = generateActionItemReminders(meetingData, 1);
          filename = 'action_item_reminders.ics';
          break;
        
        case 'package':
          events = generateMeetingCalendarPackage(meetingData, {
            includeRecap: true,
            includeActionReminders: true,
            includeFollowUp: true,
            followUpDate: addDays(new Date(), 7),
            followUpDuration: 1,
            reminderDaysBefore: 1
          });
          filename = 'meeting_calendar_package.ics';
          break;
      }

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events,
          calendarName: `${meetingData.title} - Calendar Events`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate calendar events');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadStatus({
        type: type === 'followup' ? 'Follow-up Meeting' : 
              type === 'reminders' ? 'Action Item Reminders' : 
              'Complete Calendar Package',
        success: true,
        filename
      });

      // Clear status after 5 seconds
      setTimeout(() => setDownloadStatus(null), 5000);

    } catch (error) {
      console.error('Error downloading calendar:', error);
      setDownloadStatus({
        type: type === 'followup' ? 'Follow-up Meeting' : 
              type === 'reminders' ? 'Action Item Reminders' : 
              'Complete Calendar Package',
        success: false
      });

      // Clear status after 5 seconds
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Download Status */}
      {downloadStatus && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          downloadStatus.success 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {downloadStatus.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <div>
            <div className="font-medium">
              {downloadStatus.success 
                ? `${downloadStatus.type} downloaded successfully!`
                : `Failed to download ${downloadStatus.type}`
              }
            </div>
            {downloadStatus.filename && (
              <div className="text-sm opacity-75">
                File: {downloadStatus.filename}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Events
          </CardTitle>
          <CardDescription>
            Generate calendar invites and reminders for this meeting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Follow-up Meeting */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Follow-up Meeting
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Schedule a follow-up meeting for next week to review progress
              </p>
              <Button
                onClick={() => handleQuickDownload('followup')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {/* Action Item Reminders */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Action Reminders
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Create reminders for all action items and their due dates
              </p>
              <Button
                onClick={() => handleQuickDownload('reminders')}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={meetingData.actionItems.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download ({meetingData.actionItems.length})
              </Button>
            </div>

            {/* Complete Package */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Complete Package
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Download all calendar events: recap, reminders, and follow-up
              </p>
              <Button
                onClick={() => handleQuickDownload('package')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>
          </div>

          {/* Custom Calendar Event */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Custom Calendar Event</h3>
                <p className="text-sm text-gray-600">Create a custom calendar event with specific details</p>
              </div>
              <Button
                onClick={() => setShowCalendarForm(!showCalendarForm)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showCalendarForm ? 'Hide Form' : 'Create Custom'}
              </Button>
            </div>

            {showCalendarForm && (
              <div className="mt-4">
                <CalendarDownload
                  mode="form"
                  defaultEvent={{
                    title: `Follow-up: ${meetingData.title}`,
                    description: `Follow-up meeting for: ${meetingData.title}\n\nPrevious meeting summary:\n${meetingData.summary}`,
                    startTime: addDays(new Date(), 7).toISOString().slice(0, 16),
                    duration: 1,
                    location: meetingData.location || 'Online',
                    attendees: meetingData.participants.filter(p => p.includes('@')),
                    reminder: 30,
                    priority: 'medium',
                    category: 'meeting',
                    url: meetingData.meetingUrl
                  }}
                  onDownloadComplete={(success, filename) => {
                    if (success) {
                      setDownloadStatus({
                        type: 'Custom Calendar Event',
                        success: true,
                        filename
                      });
                      setShowCalendarForm(false);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Summary for Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meeting Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Title</div>
              <div>{meetingData.title}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Duration</div>
              <div>{meetingData.duration}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Participants</div>
              <div>{meetingData.participants.length} attendees</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Action Items</div>
              <div>{meetingData.actionItems.length} items</div>
            </div>
          </div>
          
          {meetingData.actionItems.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-gray-700 mb-2">Upcoming Deadlines</div>
              <div className="space-y-1">
                {meetingData.actionItems
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 3)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                      <span className="truncate">{item.task}</span>
                      <span className="text-gray-500 ml-2">
                        {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                {meetingData.actionItems.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{meetingData.actionItems.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
