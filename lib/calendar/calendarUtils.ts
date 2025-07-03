/**
 * Calendar Utilities for InsightMeet
 * 
 * Helper functions for generating calendar events from meeting data
 */

import { addDays, addHours, format, parseISO } from 'date-fns';

export interface MeetingData {
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
}

export interface CalendarEvent {
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

/**
 * Generate a follow-up meeting calendar event from meeting data
 */
export function generateFollowUpMeeting(
  meetingData: MeetingData,
  followUpDate: Date,
  followUpDuration: number = 1
): CalendarEvent {
  const startTime = followUpDate.toISOString();
  const endTime = addHours(followUpDate, followUpDuration).toISOString();

  const description = `Follow-up meeting for: ${meetingData.title}

Previous Meeting Summary:
${meetingData.summary}

Key Points to Review:
${meetingData.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

Action Items Status:
${meetingData.actionItems.map((item, index) => 
  `${index + 1}. ${item.task} (Assigned to: ${item.assignee}, Due: ${item.dueDate})`
).join('\n')}

Please come prepared to discuss progress on action items and next steps.`;

  return {
    title: `Follow-up: ${meetingData.title}`,
    description,
    startTime,
    endTime,
    location: meetingData.location || 'Online',
    attendees: meetingData.participants.filter(p => p.includes('@')),
    reminder: 30,
    priority: 'medium',
    category: 'meeting',
    url: meetingData.meetingUrl
  };
}

/**
 * Generate action item deadline reminders as calendar events
 */
export function generateActionItemReminders(
  meetingData: MeetingData,
  reminderDaysBefore: number = 1
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const actionItem of meetingData.actionItems) {
    try {
      const dueDate = parseISO(actionItem.dueDate);
      const reminderDate = addDays(dueDate, -reminderDaysBefore);

      // Create reminder event
      const reminderEvent: CalendarEvent = {
        title: `Reminder: ${actionItem.task}`,
        description: `Action Item Reminder

Task: ${actionItem.task}
Assigned to: ${actionItem.assignee}
Due Date: ${format(dueDate, 'PPP')}
Priority: ${actionItem.priority || 'medium'}

From meeting: ${meetingData.title}
Meeting Date: ${meetingData.date}

This is a reminder that the above action item is due ${reminderDaysBefore === 1 ? 'tomorrow' : `in ${reminderDaysBefore} days`}.`,
        startTime: reminderDate.toISOString(),
        duration: 0.25, // 15 minutes
        allDay: false,
        reminder: 0, // No additional reminder needed
        priority: actionItem.priority || 'medium',
        category: 'reminder',
        attendees: [actionItem.assignee].filter(email => email.includes('@'))
      };

      events.push(reminderEvent);

      // Create due date event
      const dueDateEvent: CalendarEvent = {
        title: `Due: ${actionItem.task}`,
        description: `Action Item Due Date

Task: ${actionItem.task}
Assigned to: ${actionItem.assignee}
Priority: ${actionItem.priority || 'medium'}

From meeting: ${meetingData.title}
Meeting Date: ${meetingData.date}

This action item is due today.`,
        startTime: dueDate.toISOString(),
        duration: 0.5, // 30 minutes
        allDay: false,
        reminder: 60, // 1 hour before
        priority: actionItem.priority === 'high' ? 'high' : 'medium',
        category: 'deadline',
        attendees: [actionItem.assignee].filter(email => email.includes('@'))
      };

      events.push(dueDateEvent);
    } catch (error) {
      console.warn(`Invalid due date for action item: ${actionItem.task}`, error);
    }
  }

  return events;
}

/**
 * Generate a meeting recap event (for record keeping)
 */
export function generateMeetingRecap(meetingData: MeetingData): CalendarEvent {
  const meetingDate = parseISO(meetingData.date);
  
  const description = `Meeting Recap: ${meetingData.title}

Date: ${format(meetingDate, 'PPP')}
Duration: ${meetingData.duration}
Participants: ${meetingData.participants.join(', ')}

Summary:
${meetingData.summary}

Key Points:
${meetingData.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

Action Items:
${meetingData.actionItems.map((item, index) => 
  `${index + 1}. ${item.task} (${item.assignee}) - Due: ${item.dueDate}`
).join('\n')}

This is a record of the completed meeting for reference purposes.`;

  return {
    title: `[COMPLETED] ${meetingData.title}`,
    description,
    startTime: meetingDate.toISOString(),
    duration: parseDuration(meetingData.duration),
    location: meetingData.location || 'Online',
    attendees: meetingData.participants.filter(p => p.includes('@')),
    allDay: false,
    reminder: 0, // No reminder for past events
    priority: 'low',
    category: 'meeting',
    url: meetingData.meetingUrl
  };
}

/**
 * Generate a complete calendar package from meeting data
 */
export function generateMeetingCalendarPackage(
  meetingData: MeetingData,
  options: {
    includeRecap?: boolean;
    includeActionReminders?: boolean;
    includeFollowUp?: boolean;
    followUpDate?: Date;
    followUpDuration?: number;
    reminderDaysBefore?: number;
  } = {}
): CalendarEvent[] {
  const {
    includeRecap = true,
    includeActionReminders = true,
    includeFollowUp = false,
    followUpDate,
    followUpDuration = 1,
    reminderDaysBefore = 1
  } = options;

  const events: CalendarEvent[] = [];

  // Add meeting recap
  if (includeRecap) {
    events.push(generateMeetingRecap(meetingData));
  }

  // Add action item reminders
  if (includeActionReminders && meetingData.actionItems.length > 0) {
    events.push(...generateActionItemReminders(meetingData, reminderDaysBefore));
  }

  // Add follow-up meeting
  if (includeFollowUp && followUpDate) {
    events.push(generateFollowUpMeeting(meetingData, followUpDate, followUpDuration));
  }

  return events;
}

/**
 * Parse duration string to hours
 */
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+(?:\.\d+)?)\s*(hour|hr|h|minute|min|m)/i);
  if (!match) return 1; // Default to 1 hour

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('h')) {
    return value;
  } else if (unit.startsWith('m')) {
    return value / 60;
  }

  return 1;
}

/**
 * Validate calendar event data
 */
export function validateCalendarEvent(event: CalendarEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.title?.trim()) {
    errors.push('Title is required');
  }

  if (!event.startTime) {
    errors.push('Start time is required');
  } else {
    try {
      const startDate = new Date(event.startTime);
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start time format');
      }
    } catch {
      errors.push('Invalid start time format');
    }
  }

  if (event.endTime) {
    try {
      const endDate = new Date(event.endTime);
      const startDate = new Date(event.startTime);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end time format');
      } else if (endDate <= startDate) {
        errors.push('End time must be after start time');
      }
    } catch {
      errors.push('Invalid end time format');
    }
  }

  if (event.attendees) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const attendee of event.attendees) {
      if (!emailRegex.test(attendee)) {
        errors.push(`Invalid email address: ${attendee}`);
      }
    }
  }

  if (event.duration !== undefined && event.duration <= 0) {
    errors.push('Duration must be greater than 0');
  }

  if (event.reminder !== undefined && event.reminder < 0) {
    errors.push('Reminder time cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format calendar event for display
 */
export function formatCalendarEventSummary(event: CalendarEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : addHours(startDate, event.duration || 1);

  return `${event.title}
📅 ${format(startDate, 'PPP')}
🕐 ${format(startDate, 'p')} - ${format(endDate, 'p')}
${event.location ? `📍 ${event.location}` : ''}
${event.attendees?.length ? `👥 ${event.attendees.length} attendees` : ''}`;
}
