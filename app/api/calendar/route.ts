import { NextResponse } from 'next/server';
import { createEvent, createEvents, DateArray, EventAttributes } from 'ics';
import { addHours, addMinutes, format, parseISO } from 'date-fns';

interface CalendarEvent {
  title: string;
  description: string;
  startTime: string | Date; // Accept both string and Date
  endTime?: string | Date; // Optional end time
  duration?: number; // in hours (fallback if no endTime)
  location?: string;
  attendees?: string[];
  allDay?: boolean;
  reminder?: number; // minutes before event
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  url?: string;
}

interface BulkCalendarRequest {
  events: CalendarEvent[];
  calendarName?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a bulk request (multiple events)
    if (body.events && Array.isArray(body.events)) {
      return handleBulkEvents(body as BulkCalendarRequest);
    }

    // Handle single event
    return handleSingleEvent(body as CalendarEvent);
  } catch (error: any) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate calendar event'
      },
      { status: 500 }
    );
  }
}

async function handleSingleEvent(eventData: CalendarEvent) {
  const {
    title,
    description,
    startTime,
    endTime,
    duration = 1,
    location = '',
    attendees = [],
    allDay = false,
    reminder = 30,
    priority = 'medium',
    category = 'meeting',
    url
  } = eventData;

  // Validate required fields
  if (!title || !startTime) {
    return NextResponse.json(
      {
        success: false,
        error: 'Title and start time are required'
      },
      { status: 400 }
    );
  }

  // Parse dates
  const startDate = typeof startTime === 'string' ? parseISO(startTime) : new Date(startTime);
  let endDate: Date;

  if (endTime) {
    endDate = typeof endTime === 'string' ? parseISO(endTime) : new Date(endTime);
  } else {
    endDate = addHours(startDate, duration);
  }

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)'
      },
      { status: 400 }
    );
  }

  if (endDate <= startDate) {
    return NextResponse.json(
      {
        success: false,
        error: 'End time must be after start time'
      },
      { status: 400 }
    );
  }

  // Format dates for ICS
  const formatDateArray = (date: Date): DateArray => {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ];
  };

  // Create event object
  const event: EventAttributes = {
    title,
    description: description || `Meeting: ${title}`,
    location: location || 'Online',
    start: formatDateArray(startDate),
    end: formatDateArray(endDate),
    startInputType: 'local',
    endInputType: 'local',
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: { name: 'InsightMeet', email: 'noreply@insightmeet.app' },
    attendees: attendees.map(email => ({
      name: email.split('@')[0],
      email,
      rsvp: true,
      partstat: 'NEEDS-ACTION'
    })),
    categories: [category],
    classification: priority === 'high' ? 'CONFIDENTIAL' : 'PUBLIC',
    ...(url && { url }),
    ...(allDay && {
      start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()],
      end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()],
      startInputType: 'local',
      endInputType: 'local'
    }),
    alarms: [
      {
        action: 'display',
        trigger: { minutes: reminder, before: true },
        description: `Reminder: ${title}`
      }
    ],
  };

  const { value: icsContent, error } = createEvent(event);

  if (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create calendar event',
        details: error
      },
      { status: 500 }
    );
  }

  // Generate a safe filename
  const safeTitle = title.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
  const dateStr = format(startDate, 'yyyy-MM-dd');
  const filename = `${safeTitle}_${dateStr}.ics`;

  // Return the ICS file as a downloadable response
  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

async function handleBulkEvents(bulkData: BulkCalendarRequest) {
  const { events, calendarName = 'InsightMeet_Events' } = bulkData;

  if (!events || events.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'At least one event is required'
      },
      { status: 400 }
    );
  }

  // Format dates for ICS
  const formatDateArray = (date: Date): DateArray => {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ];
  };

  // Convert events to ICS format
  const icsEvents: EventAttributes[] = [];

  for (const eventData of events) {
    const {
      title,
      description,
      startTime,
      endTime,
      duration = 1,
      location = '',
      attendees = [],
      allDay = false,
      reminder = 30,
      priority = 'medium',
      category = 'meeting',
      url
    } = eventData;

    // Validate required fields
    if (!title || !startTime) {
      return NextResponse.json(
        {
          success: false,
          error: `Event "${title || 'Untitled'}" is missing required fields (title, startTime)`
        },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = typeof startTime === 'string' ? parseISO(startTime) : new Date(startTime);
    let endDate: Date;

    if (endTime) {
      endDate = typeof endTime === 'string' ? parseISO(endTime) : new Date(endTime);
    } else {
      endDate = addHours(startDate, duration);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid date format in event "${title}". Use ISO 8601 format`
        },
        { status: 400 }
      );
    }

    // Create event object
    const event: EventAttributes = {
      title,
      description: description || `Meeting: ${title}`,
      location: location || 'Online',
      start: formatDateArray(startDate),
      end: formatDateArray(endDate),
      startInputType: 'local',
      endInputType: 'local',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'InsightMeet', email: 'noreply@insightmeet.app' },
      attendees: attendees.map(email => ({
        name: email.split('@')[0],
        email,
        rsvp: true,
        partstat: 'NEEDS-ACTION'
      })),
      categories: [category],
      classification: priority === 'high' ? 'CONFIDENTIAL' : 'PUBLIC',
      ...(url && { url }),
      ...(allDay && {
        start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()],
        end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()],
        startInputType: 'local',
        endInputType: 'local'
      }),
      alarms: [
        {
          action: 'display',
          trigger: { minutes: reminder, before: true },
          description: `Reminder: ${title}`
        }
      ],
    };

    icsEvents.push(event);
  }

  // Create multiple events
  const { value: icsContent, error } = createEvents(icsEvents);

  if (error) {
    console.error('Error creating calendar events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create calendar events',
        details: error
      },
      { status: 500 }
    );
  }

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `${calendarName.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase()}_${dateStr}.ics`;

  // Return the ICS file as a downloadable response
  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
