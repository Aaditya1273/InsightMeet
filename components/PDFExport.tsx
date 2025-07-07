import { Button } from './ui/button';
import { Download, FileText, Settings, Image, Calendar, Clock, Users, Tag, Palette, Lock } from 'lucide-react';
import { useState } from 'react';

// Enhanced types for maximum flexibility
type PDFTheme = 'professional' | 'modern' | 'minimal' | 'creative' | 'executive';
type PDFLayout = 'single' | 'two-column' | 'presentation' | 'report';
type PDFSize = 'a4' | 'a3' | 'letter' | 'legal' | 'tabloid';
type PDFOrientation = 'portrait' | 'landscape';

interface PDFMetadata {
  title?: string;
  subject?: string;
  author?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

interface PDFStyling {
  theme: PDFTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface PDFSection {
  title: string;
  content: string;
  type: 'text' | 'list' | 'table' | 'image' | 'code' | 'quote';
  styling?: Partial<PDFStyling>;
  pageBreak?: boolean;
  columns?: Array<{header: string, dataKey: string}>;
  rows?: Array<Record<string, string | number>>;
}

interface PDFHeader {
  enabled: boolean;
  content: string;
  logo?: string;
  showDate?: boolean;
  showPageNumber?: boolean;
}

interface PDFFooter {
  enabled: boolean;
  content: string;
  showPageNumber?: boolean;
  showTimestamp?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
}

interface PDFTableOfContents {
  enabled: boolean;
  title: string;
  depth: number;
  pageBreak: boolean;
}

interface PDFSecurity {
  enabled: boolean;
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing: boolean;
    modifying: boolean;
    copying: boolean;
    annotating: boolean;
  };
}

type PDFExportProps = {
  content: string | PDFSection[];
  fileName?: string;
  className?: string;
  metadata?: PDFMetadata;
  styling?: Partial<PDFStyling>;
  layout?: PDFLayout;
  size?: PDFSize;
  orientation?: PDFOrientation;
  header?: PDFHeader;
  footer?: PDFFooter;
  tableOfContents?: PDFTableOfContents;
  security?: PDFSecurity;
  compression?: boolean;
  embedFonts?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  attachments?: File[];
  watermark?: {
    text: string;
    opacity: number;
    rotation: number;
    fontSize: number;
  };
  onProgress?: (progress: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
};

const DEFAULT_STYLING: PDFStyling = {
  theme: 'professional',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  fontFamily: 'helvetica',
  fontSize: 12,
  lineHeight: 1.5,
  margins: { top: 20, right: 20, bottom: 20, left: 20 }
};

const THEME_CONFIGS = {
  professional: {
    primaryColor: '#1e40af',
    secondaryColor: '#475569',
    accentColor: '#059669',
    fontFamily: 'times'
  },
  modern: {
    primaryColor: '#7c3aed',
    secondaryColor: '#6b7280',
    accentColor: '#06b6d4',
    fontFamily: 'helvetica'
  },
  minimal: {
    primaryColor: '#374151',
    secondaryColor: '#9ca3af',
    accentColor: '#f59e0b',
    fontFamily: 'helvetica'
  },
  creative: {
    primaryColor: '#dc2626',
    secondaryColor: '#7c2d12',
    accentColor: '#ea580c',
    fontFamily: 'helvetica'
  },
  executive: {
    primaryColor: '#1f2937',
    secondaryColor: '#4b5563',
    accentColor: '#d97706',
    fontFamily: 'times'
  }
};

export function PDFExport({
  content,
  fileName = 'document',
  className = '',
  metadata = {},
  styling = {},
  layout = 'single',
  size = 'a4',
  orientation = 'portrait',
  header = { enabled: false, content: '', showDate: true, showPageNumber: true },
  footer = { enabled: true, content: '', showPageNumber: true, showTimestamp: true },
  tableOfContents = { enabled: false, title: 'Table of Contents', depth: 3, pageBreak: true },
  security = { enabled: false },
  compression = true,
  embedFonts = true,
  quality = 'high',
  attachments = [],
  watermark,
  onProgress,
  onComplete,
  onError
}: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateProgress = (value: number) => {
    setProgress(value);
    onProgress?.(value);
  };

  const generateAdvancedPDF = async () => {
    setIsGenerating(true);
    updateProgress(0);

    try {
      updateProgress(10);
      
      // Dynamically import jsPDF with advanced plugins
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      
      updateProgress(20);

      // Merge styling with theme and defaults
      const finalStyling = {
        ...DEFAULT_STYLING,
        ...THEME_CONFIGS[styling.theme || 'professional'],
        ...styling
      };

      // Create PDF with advanced options
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: size,
        compress: compression,
        hotfixes: ['px_scaling'],
        precision: quality === 'ultra' ? 16 : quality === 'high' ? 10 : 5
      });

      updateProgress(30);

      // Set enhanced metadata
      const enhancedMetadata = {
        title: metadata.title || 'Advanced Document',
        subject: metadata.subject || 'Generated PDF Document',
        author: metadata.author || 'PDFExport Enhanced',
        keywords: metadata.keywords?.join(', ') || 'pdf, document, export',
        creator: metadata.creator || 'Advanced PDFExport v2.0',
        producer: metadata.producer || 'jsPDF Enhanced',
        creationDate: metadata.creationDate || new Date(),
        modificationDate: metadata.modificationDate || new Date()
      };

      doc.setProperties(enhancedMetadata);
      updateProgress(40);

      // Apply security if enabled
      // Note: jsPDF does not support encryption natively, so this section is commented out
      /* if (security.enabled) {
        doc.encrypt(
          security.userPassword || '',
          security.ownerPassword || 'owner',
          security.permissions || {
            printing: true,
            modifying: false,
            copying: true,
            annotating: false
          }
        );
      } */

      updateProgress(50);

      // Set up page dimensions and margins
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = finalStyling.margins;

      // Add watermark if specified
      if (watermark) {
        const addWatermark = () => {
          doc.saveGraphicsState();
          doc.setGState(doc.GState({ opacity: watermark.opacity }));
          doc.setTextColor(200, 200, 200);
          doc.setFontSize(watermark.fontSize);
          
          const textWidth = doc.getTextWidth(watermark.text);
          const x = (pageWidth - textWidth) / 2;
          const y = pageHeight / 2;
          
          doc.text(watermark.text, x, y, {
            angle: watermark.rotation,
            align: 'center'
          });
          
          doc.restoreGraphicsState();
        };
        
        // Add watermark to first page
        addWatermark();
      }

      updateProgress(60);

      // Process content based on type
      let yPosition = margins.top;
      let currentPage = 1;

      // Add header if enabled
      if (header.enabled) {
        doc.setFontSize(10);
        doc.setTextColor(finalStyling.secondaryColor);
        
        if (header.logo) {
          // Add logo logic here
        }
        
        doc.text(header.content, margins.left, margins.top - 10);
        
        if (header.showDate) {
          doc.text(
            new Date().toLocaleDateString(),
            pageWidth - margins.right - 30,
            margins.top - 10
          );
        }
        
        yPosition += 10;
      }

      // Add table of contents if enabled
      if (tableOfContents.enabled && Array.isArray(content)) {
        doc.setFontSize(18);
        doc.setTextColor(finalStyling.primaryColor);
        doc.text(tableOfContents.title, margins.left, yPosition);
        yPosition += 15;

        doc.setFontSize(12);
        doc.setTextColor(finalStyling.secondaryColor);
        
        content.forEach((section, index) => {
          if (section.title) {
            doc.text(`${index + 1}. ${section.title}`, margins.left + 5, yPosition);
            yPosition += 8;
          }
        });

        if (tableOfContents.pageBreak) {
          doc.addPage();
          yPosition = margins.top;
          currentPage++;
        }
      }

      updateProgress(70);

      // Process main content
      if (typeof content === 'string') {
        // Simple text content
        doc.setFontSize(finalStyling.fontSize);
        doc.setTextColor(finalStyling.primaryColor);
        doc.text('Document Content', margins.left, yPosition);
        yPosition += 10;

        doc.setFontSize(finalStyling.fontSize);
        doc.setTextColor(0, 0, 0);
        const splitText = doc.splitTextToSize(
          content,
          pageWidth - margins.left - margins.right
        );
        
        doc.text(splitText, margins.left, yPosition);
      } else {
        // Advanced section-based content
        for (const section of content) {
          // Check if we need a new page
          if (yPosition > pageHeight - margins.bottom - 30) {
            doc.addPage();
            yPosition = margins.top;
            currentPage++;
            
            // Add watermark to new page
            if (watermark) {
              doc.saveGraphicsState();
              doc.setGState(doc.GState({ opacity: watermark.opacity }));
              doc.setTextColor(200, 200, 200);
              doc.setFontSize(watermark.fontSize);
              
              const textWidth = doc.getTextWidth(watermark.text);
              const x = (pageWidth - textWidth) / 2;
              const y = pageHeight / 2;
              
              doc.text(watermark.text, x, y, {
                angle: watermark.rotation,
                align: 'center'
              });
              
              doc.restoreGraphicsState();
            }
          }

          // Add section title
          if (section.title) {
            doc.setFontSize(16);
            doc.setTextColor(finalStyling.primaryColor);
            doc.text(section.title, margins.left, yPosition);
            yPosition += 12;
          }

          // Add section content based on type
          switch (section.type) {
            case 'text':
              doc.setFontSize(finalStyling.fontSize);
              doc.setTextColor(0, 0, 0);
              const textLines = doc.splitTextToSize(
                section.content,
                pageWidth - margins.left - margins.right
              );
              doc.text(textLines, margins.left, yPosition);
              yPosition += textLines.length * finalStyling.fontSize * 0.5;
              break;

            case 'list':
              doc.setFontSize(finalStyling.fontSize);
              doc.setTextColor(0, 0, 0);
              const listItems = section.content.split('\n');
              listItems.forEach(item => {
                if (item.trim()) {
                  doc.text(`• ${item.trim()}`, margins.left + 5, yPosition);
                  yPosition += finalStyling.fontSize * 0.7;
                }
              });
              break;

            case 'quote':
              doc.setFontSize(finalStyling.fontSize - 1);
              doc.setTextColor(finalStyling.secondaryColor);
              doc.setFont(undefined, 'italic');
              const quoteLines = doc.splitTextToSize(
                `"${section.content}"`,
                pageWidth - margins.left - margins.right - 20
              );
              doc.text(quoteLines, margins.left + 10, yPosition);
              doc.setFont(undefined, 'normal');
              yPosition += quoteLines.length * finalStyling.fontSize * 0.5;
              break;

            case 'code':
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              doc.setFont('courier');
              // Add background for code block
              doc.setFillColor(245, 245, 245);
              doc.rect(margins.left, yPosition - 5, pageWidth - margins.left - margins.right, 20, 'F');
              
              const codeLines = doc.splitTextToSize(
                section.content,
                pageWidth - margins.left - margins.right - 10
              );
              doc.text(codeLines, margins.left + 5, yPosition);
              doc.setFont('helvetica');
              yPosition += codeLines.length * 12 * 0.5 + 10;
              break;

            case 'table':
              autoTable(doc, {
                columns: section.columns,
                body: section.rows,
                startY: yPosition,
                theme: 'grid',
                styles: {
                  fontSize: finalStyling.fontSize,
                  cellPadding: 5,
                  overflow: 'linebreak',
                  valign: 'middle'
                },
                headStyles: {
                  fillColor: finalStyling.primaryColor,
                  textColor: 255,
                  fontSize: finalStyling.fontSize + 1
                }
              });
              yPosition += autoTable.previous.finalY + 10;
              break;

            default:
              // Default text handling
              doc.setFontSize(finalStyling.fontSize);
              doc.setTextColor(0, 0, 0);
              const defaultLines = doc.splitTextToSize(
                section.content,
                pageWidth - margins.left - margins.right
              );
              doc.text(defaultLines, margins.left, yPosition);
              yPosition += defaultLines.length * finalStyling.fontSize * 0.5;
              break;
          }

          yPosition += 8; // Space between sections

          // Add page break if specified
          if (section.pageBreak) {
            doc.addPage();
            yPosition = margins.top;
            currentPage++;
          }
        }
      }

      updateProgress(80);

      // Add footer to all pages
      if (footer.enabled) {
        const pageCount = doc.internal.pages.length - 1;
        
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(finalStyling.secondaryColor);
          
          if (footer.showPageNumber) {
            doc.text(
              `Page ${i} of ${pageCount}`,
              pageWidth - margins.right - 25,
              pageHeight - margins.bottom + 10
            );
          }
          
          if (footer.showTimestamp) {
            doc.text(
              new Date().toLocaleString(),
              margins.left,
              pageHeight - margins.bottom + 10
            );
          }
          
          if (footer.content) {
            doc.text(
              footer.content,
              pageWidth / 2,
              pageHeight - margins.bottom + 10,
              { align: 'center' }
            );
          }
        }
      }

      updateProgress(90);

      // Generate final PDF
      const pdfBlob = doc.output('blob');
      
      updateProgress(100);
      
      // Save or return the PDF
      if (onComplete) {
        onComplete(pdfBlob);
      } else {
        doc.save(`${fileName}.pdf`);
      }

      // Success notification
      console.log('✅ PDF generated successfully with advanced features!');
      
    } catch (error) {
      console.error('❌ Error generating advanced PDF:', error);
      onError?.(error as Error);
      alert('Failed to generate PDF. Please check console for details.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={generateAdvancedPDF}
        disabled={isGenerating}
        className={`${className} ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isGenerating ? (
          <>
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Generating... {progress}%
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export Advanced PDF
          </>
        )}
      </Button>
      
      {isGenerating && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Utility functions for advanced PDF operations
export const createPDFSection = (
  title: string,
  content: string,
  type: PDFSection['type'] = 'text',
  options: Partial<PDFSection> = {}
): PDFSection => ({
  title,
  content,
  type,
  ...options
});

export const createPDFMetadata = (options: Partial<PDFMetadata> = {}): PDFMetadata => ({
  title: 'Document',
  subject: 'PDF Export',
  author: 'User',
  keywords: ['pdf', 'export'],
  creator: 'PDFExport Enhanced',
  creationDate: new Date(),
  ...options
});

export const PDFPresets = {
  meetingSummary: {
    metadata: createPDFMetadata({
      title: 'Meeting Summary',
      subject: 'Meeting Notes and Action Items',
      keywords: ['meeting', 'summary', 'action-items']
    }),
    styling: { theme: 'professional' as PDFTheme },
    header: { enabled: true, content: 'Meeting Summary', showDate: true },
    footer: { enabled: true, showPageNumber: true, showTimestamp: true }
  },
  
  report: {
    metadata: createPDFMetadata({
      title: 'Business Report',
      subject: 'Comprehensive Business Analysis',
      keywords: ['report', 'business', 'analysis']
    }),
    styling: { theme: 'executive' as PDFTheme },
    tableOfContents: { enabled: true, title: 'Table of Contents', depth: 3, pageBreak: true },
    header: { enabled: true, content: 'Business Report', showDate: true },
    footer: { enabled: true, showPageNumber: true, content: 'Confidential' }
  },
  
  presentation: {
    metadata: createPDFMetadata({
      title: 'Presentation',
      subject: 'Slide Deck Export',
      keywords: ['presentation', 'slides', 'deck']
    }),
    styling: { theme: 'modern' as PDFTheme },
    layout: 'presentation' as PDFLayout,
    orientation: 'landscape' as PDFOrientation,
    header: { enabled: false, content: '' },
    footer: { enabled: true, showPageNumber: true }
  }
};

// Export utility for batch PDF generation
export const generateBatchPDFs = async (
  documents: Array<{ content: string | PDFSection[]; fileName: string; options?: Partial<PDFExportProps> }>,
  onProgress?: (current: number, total: number) => void
): Promise<Blob[]> => {
  const results: Blob[] = [];
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    onProgress?.(i + 1, documents.length);
    
    // Create a temporary PDF export instance
    const pdfExport = new PDFExport({
      content: doc.content,
      fileName: doc.fileName,
      ...doc.options
    });
    
    // Generate PDF and collect blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      pdfExport.generateAdvancedPDF();
      // Implementation would need to be adapted for batch processing
    });
    
    results.push(blob);
  }
  
  return results;
};