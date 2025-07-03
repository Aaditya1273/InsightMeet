'use client';

import { useState } from 'react';
import { CalendarDownload } from '../../components/CalendarDownload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Plus
} from 'lucide-react';
import { 
  generateMeetingCalendarPackage,
  generateFollowUpMeeting,
  generateActionItemReminders,
  type MeetingData,
  type CalendarEvent
} from '../../lib/calendar/calendarUtils';
import { addDays, addHours } from 'date-fns';

export default function TestCalendarPage() {
  const [downloadStatus, setDownloadStatus] = useState<{
    type: string;
    success: boolean;
    filename?: string;
  } | null>(null);

  // Sample meeting data
  const sampleMeetingData: MeetingData = {
    title: "Q4 Planning & Strategy Meeting",
    date: new Date().toISOString(),
    duration: "2 hours",
    participants: [
      "john.doe@company.com",
      "jane.smith@company.com", 
      "team.lead@company.com",
      "product.manager@company.com"
    ],
    summary: "We discussed Q4 objectives, budget allocation, and resource planning. Key decisions were made regarding project priorities, timeline adjustments, and team restructuring. The meeting covered strategic initiatives, market analysis, and competitive positioning for the upcoming quarter.",
    keyPoints: [
      "Q4 budget approved with 15% increase from previous quarter",
      "New hiring plan approved for 3 additional developers and 1 designer",
      "Product launch timeline moved to December to ensure quality",
      "Marketing campaign budget allocated $50K for Q4 initiatives",
      "Remote work policy updated to hybrid model starting November"
    ],
    actionItems: [
      {
        task: "Finalize Q4 budget spreadsheet with detailed breakdown",
        assignee: "john.doe@company.com",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        priority: "high"
      },
      {
        task: "Create job postings for developer and designer positions",
        assignee: "jane.smith@company.com",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        priority: "medium"
      },
      {
        task: "Schedule product launch planning meeting with stakeholders",
        assignee: "team.lead@company.com",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        priority: "high"
      },
      {
        task: "Draft marketing campaign proposal for Q4",
        assignee: "product.manager@company.com",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        priority: "medium"
      }
    ],
    location: "Conference Room A / Zoom",
    meetingUrl: "https://zoom.us/j/123456789"
  };

  // Generate sample events
  const followUpMeeting = generateFollowUpMeeting(
    sampleMeetingData,
    addDays(new Date(), 7), // 1 week from now
    1.5 // 1.5 hours
  );

  const actionItemReminders = generateActionItemReminders(sampleMeetingData, 1);

  const fullCalendarPackage = generateMeetingCalendarPackage(sampleMeetingData, {
    includeRecap: true,
    includeActionReminders: true,
    includeFollowUp: true,
    followUpDate: addDays(new Date(), 7),
    followUpDuration: 1.5,
    reminderDaysBefore: 1
  });

  const handleDownloadStart = () => {
    setDownloadStatus(null);
  };

  const handleDownloadComplete = (success: boolean, filename?: string, type: string = 'event') => {
    setDownloadStatus({ type, success, filename });
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Calendar Generation Test</h1>
        <p className="text-gray-600">
          Test the InsightMeet calendar functionality with ICS file generation
        </p>
      </div>

      {/* Download Status */}
      {downloadStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${
              downloadStatus.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {downloadStatus.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span className="font-medium">
                {downloadStatus.success 
                  ? `${downloadStatus.type} downloaded successfully!`
                  : `Failed to download ${downloadStatus.type}`
                }
              </span>
            </div>
            {downloadStatus.filename && (
              <div className="mt-1 text-sm text-gray-600">
                File: {downloadStatus.filename}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Download Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Quick Downloads
          </CardTitle>
          <CardDescription>
            Download pre-configured calendar events based on sample meeting data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CalendarDownload
              mode="single"
              defaultEvent={followUpMeeting}
              onDownloadStart={handleDownloadStart}
              onDownloadComplete={(success, filename) => 
                handleDownloadComplete(success, filename, 'Follow-up Meeting')
              }
            />
            
            <CalendarDownload
              mode="bulk"
              events={actionItemReminders}
              onDownloadStart={handleDownloadStart}
              onDownloadComplete={(success, filename) => 
                handleDownloadComplete(success, filename, 'Action Item Reminders')
              }
            />
            
            <CalendarDownload
              mode="bulk"
              events={fullCalendarPackage}
              onDownloadStart={handleDownloadStart}
              onDownloadComplete={(success, filename) => 
                handleDownloadComplete(success, filename, 'Complete Calendar Package')
              }
            />

            <Button
              onClick={() => {
                const customEvent: CalendarEvent = {
                  title: "Daily Standup",
                  description: "Daily team standup meeting to discuss progress and blockers",
                  startTime: addHours(new Date(), 1).toISOString(),
                  duration: 0.5,
                  location: "Online",
                  attendees: sampleMeetingData.participants,
                  reminder: 15,
                  priority: 'medium',
                  category: 'meeting'
                };
                
                fetch('/api/calendar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(customEvent)
                })
                .then(response => {
                  if (response.ok) {
                    return response.blob();
                  }
                  throw new Error('Failed to generate calendar');
                })
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'daily_standup.ics';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  handleDownloadComplete(true, 'daily_standup.ics', 'Daily Standup');
                })
                .catch(() => {
                  handleDownloadComplete(false, undefined, 'Daily Standup');
                });
              }}
              className="flex items-center gap-2 h-auto p-4 flex-col"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Download Daily Standup</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Meeting Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sample Meeting Data
          </CardTitle>
          <CardDescription>
            This is the meeting data used to generate the calendar events above
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Meeting Details</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Title:</strong> {sampleMeetingData.title}</div>
                <div><strong>Duration:</strong> {sampleMeetingData.duration}</div>
                <div><strong>Location:</strong> {sampleMeetingData.location}</div>
                <div><strong>Participants:</strong> {sampleMeetingData.participants.length}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Action Items</h3>
              <div className="space-y-2 text-sm">
                {sampleMeetingData.actionItems.map((item, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-3">
                    <div className="font-medium">{item.task}</div>
                    <div className="text-gray-600">
                      {item.assignee} • Due: {new Date(item.dueDate).toLocaleDateString()} • 
                      <span className={`ml-1 px-1 rounded text-xs ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Key Points</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {sampleMeetingData.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Event Form */}
      <CalendarDownload
        mode="form"
        defaultEvent={{
          title: "Custom Meeting",
          description: "Create your own calendar event",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Tomorrow
          duration: 1,
          location: "Conference Room",
          attendees: ["user@example.com"],
          reminder: 30,
          priority: 'medium',
          category: 'meeting'
        }}
        onDownloadStart={handleDownloadStart}
        onDownloadComplete={(success, filename) => 
          handleDownloadComplete(success, filename, 'Custom Event')
        }
      />

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>
            How to use the calendar API programmatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Single Event</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
{`POST /api/calendar
Content-Type: application/json

{
  "title": "Meeting Title",
  "description": "Meeting description",
  "startTime": "2024-01-15T10:00:00",
  "endTime": "2024-01-15T11:00:00",
  "location": "Conference Room",
  "attendees": ["user@example.com"],
  "reminder": 30,
  "priority": "medium"
}`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Multiple Events</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
{`POST /api/calendar
Content-Type: application/json

{
  "events": [
    {
      "title": "Event 1",
      "startTime": "2024-01-15T10:00:00",
      "duration": 1
    },
    {
      "title": "Event 2", 
      "startTime": "2024-01-16T14:00:00",
      "duration": 2
    }
  ],
  "calendarName": "My Events"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
