import { join } from 'path';
import { writeFile } from 'fs/promises';
import PDFDocument from 'pdfkit';

const EXPORT_DIR = join(process.cwd(), 'exports');

// Ensure export directory exists
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

if (!existsSync(EXPORT_DIR)) {
  await mkdir(EXPORT_DIR, { recursive: true });
}

export async function generateMeetingSummaryPDF(meetingData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const fileName = `meeting-summary-${Date.now()}.pdf`;
      const filePath = join(EXPORT_DIR, fileName);
      const stream = doc.pipe(require('fs').createWriteStream(filePath));

      // Add title
      doc.fontSize(20).text('Meeting Summary', { align: 'center' });
      doc.moveDown();

      // Add date
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      // Add summary section
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(meetingData.summary.fullSummary);
      doc.moveDown();

      // Add key points
      doc.fontSize(16).text('Key Points', { underline: true });
      doc.moveDown(0.5);
      meetingData.summary.keyPoints.forEach(point => {
        doc.fontSize(12).text(`• ${point}`);
      });
      doc.moveDown();

      // Add action items
      doc.addPage();
      doc.fontSize(16).text('Action Items', { underline: true });
      doc.moveDown(0.5);
      meetingData.actionItems.forEach((item, index) => {
        doc.fontSize(12).text(`${index + 1}. ${item}`);
        doc.moveDown(0.5);
      });

      // Add follow-up message
      doc.addPage();
      doc.fontSize(16).text('Suggested Follow-up Message', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(meetingData.followUp);

      // Add original text (first page only)
      doc.addPage();
      doc.fontSize(16).text('Full Transcript', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(meetingData.originalText, {
        align: 'left',
        width: 500,
        indent: 10,
        height: 700,
        ellipsis: '...'
      });

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
