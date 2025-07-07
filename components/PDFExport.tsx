import { Button } from './ui/button';
import { Download } from 'lucide-react';

type PDFExportProps = {
  content: string;
  fileName?: string;
  className?: string;
};

export function PDFExport({ content, fileName = 'meeting-summary', className = '' }: PDFExportProps) {
  const generatePDF = async () => {
    try {
      // Dynamically import jsPDF to reduce initial bundle size
      const { jsPDF } = await import('jspdf');
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: 'Meeting Summary',
        subject: 'Meeting notes and action items',
        author: 'InsightMeet',
        keywords: 'meeting, summary, action items',
        creator: 'InsightMeet',
      });
      
      // Add title
      doc.setFontSize(22);
      doc.text('Meeting Summary', 14, 22);
      
      // Add content
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(content, 180);
      doc.text(splitText, 14, 40);
      
      // Add page number
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10
        );
      }
      
      // Save the PDF
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      Export as PDF
    </Button>
  );
}
