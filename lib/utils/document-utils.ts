import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import ics from 'ics';

/**
 * Generates a PDF summary document from analysis results
 */
export async function generateSummaryPDF(result: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Add title
  page.drawText(result.title || 'Meeting Summary', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0),
  });

  // Add date
  page.drawText(`Date: ${result.date}`, {
    x: 50,
    y: height - 80,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Add summary
  page.drawText('Summary:', {
    x: 50,
    y: height - 120,
    size: 16,
    color: rgb(0, 0, 0),
  });
  page.drawText(result.summary || 'No summary available', {
    x: 50,
    y: height - 150,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Add key points
  page.drawText('Key Points:', {
    x: 50,
    y: height - 200,
    size: 16,
    color: rgb(0, 0, 0),
  });
  result.keyPoints?.forEach((point: string, index: number) => {
    page.drawText(`• ${point}`, {
      x: 60,
      y: height - 230 - (index * 20),
      size: 12,
      color: rgb(0, 0, 0),
    });
  });

  // Add action items
  if (result.actionItems?.length > 0) {
    page.drawText('Action Items:', {
      x: 50,
      y: height - 300,
      size: 16,
      color: rgb(0, 0, 0),
    });
    result.actionItems.forEach((item: any, index: number) => {
      page.drawText(`• ${item.task} - ${item.assignee}`, {
        x: 60,
        y: height - 330 - (index * 20),
        size: 12,
        color: rgb(0, 0, 0),
      });
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Save with FileSaver
  saveAs(pdfBlob, `${result.title || 'Meeting'}_Summary.pdf`);
}

/**
 * Generates an ICS calendar event from meeting details
 */
export function generateCalendarEvent(result: any) {
  const { title, date, duration, participants } = result;
  
  // Parse date and duration
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setMinutes(endDate.getMinutes() + (duration || 60));

  // Create calendar event
  const event = {
    title: title || 'Meeting',
    start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(),
            startDate.getHours(), startDate.getMinutes()],
    end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(),
           endDate.getHours(), endDate.getMinutes()],
    description: result.summary || 'Meeting summary',
    attendees: participants?.map(p => ({
      email: p,
      rsvp: true
    })) || [],
  };

  // Generate ICS file
  ics.createEvent(event, (error, value) => {
    if (error) {
      console.error('Error generating calendar event:', error);
      return;
    }

    // Create blob and trigger download
    const blob = new Blob([value], { type: 'text/calendar' });
    saveAs(blob, `${title || 'Meeting'}_Invite.ics`);
  });
}

/**
 * Generates both PDF and calendar event from analysis results
 */
export async function generateDocuments(result: any) {
  try {
    // Generate PDF
    await generateSummaryPDF(result);
    
    // Generate calendar event
    generateCalendarEvent(result);
    
    return true;
  } catch (error) {
    console.error('Error generating documents:', error);
    return false;
  }
}
