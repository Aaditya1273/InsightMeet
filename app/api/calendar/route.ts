import { NextResponse } from 'next/server';
import { createEvent, DateArray, EventAttributes } from 'ics';
import { addHours, format } from 'date-fns';

interface CalendarEvent {
  title: string;
  description: string;
  startTime: Date;
  duration: number; // in hours
  location?: string;
  attendees?: string[];
}

export async function POST(request: Request) {
  try {
    const { 
      title, 
      description, 
      startTime, 
      duration = 1,
      location = 'Online',
      attendees = []
    }: CalendarEvent = await request.json();

    if (!title || !startTime) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startTime);
    const endDate = addHours(startDate, duration);

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

    const event: EventAttributes = {
      title,
      description,
      location,
      start: formatDateArray(startDate),
      end: formatDateArray(endDate),
      startInputType: 'utc',
      endInputType: 'utc',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'InsightMeet', email: 'noreply@insightmeet.app' },
      attendees: attendees.map(email => ({ name: email, email, rsvp: true })),
      alarms: [
        { action: 'display', trigger: { hours: 1, before: true } },
        { action: 'display', trigger: { minutes: 30, before: true } },
      ],
    };

    const { value: icsContent, error } = createEvent(event);

    if (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }

    // Generate a filename with the event title and date
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format(startDate, 'yyyy-MM-dd')}.ics`;

    // Return the ICS file as a downloadable response
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar event' },
      { status: 500 }
    );
  }
}
