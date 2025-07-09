import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';

const EXPORT_DIR = join(process.cwd(), 'exports');

// Ensure export directory exists
if (!existsSync(EXPORT_DIR)) {
  await mkdir(EXPORT_DIR, { recursive: true });
}

// Enhanced PDF configuration
const PDF_CONFIG = {
  size: 'A4',
  margin: 50,
  bufferPages: true,
  autoFirstPage: false,
  compress: true,
  info: {
    Title: 'Meeting Summary Report',
    Author: 'Meeting Assistant',
    Creator: 'Enhanced PDF Generator',
    Producer: 'PDFKit Enhanced',
    CreationDate: new Date()
  }
};

// Color scheme and styling
const COLORS = {
  primary: '#2563eb',      // Blue
  secondary: '#64748b',    // Slate
  accent: '#10b981',       // Emerald
  text: '#1f2937',         // Dark gray
  lightText: '#6b7280',    // Medium gray
  background: '#f8fafc',   // Light background
  border: '#e2e8f0',       // Light border
  success: '#059669',      // Green
  warning: '#d97706',      // Orange
  error: '#dc2626'         // Red
};

// Typography settings
const FONTS = {
  title: { size: 24, weight: 'bold' },
  heading: { size: 18, weight: 'bold' },
  subheading: { size: 14, weight: 'bold' },
  body: { size: 11, weight: 'normal' },
  small: { size: 9, weight: 'normal' },
  caption: { size: 8, weight: 'normal' }
};

class EnhancedPDFGenerator {
  constructor() {
    this.doc = null;
    this.currentPage = 0;
    this.yPosition = 0;
    this.pageHeight = 0;
    this.pageWidth = 0;
    this.margins = PDF_CONFIG.margin;
  }

  initialize() {
    this.doc = new PDFDocument(PDF_CONFIG);
    this.pageHeight = this.doc.page.height;
    this.pageWidth = this.doc.page.width;
    this.yPosition = this.margins;
    this.currentPage = 0;
  }

  // Add a new page with consistent styling
  addPage() {
    this.doc.addPage();
    this.currentPage++;
    this.yPosition = this.margins;
    this.addPageHeader();
    this.addPageFooter();
  }

  // Add page header
  addPageHeader() {
    if (this.currentPage === 0) return;

    const headerY = 30;
    this.doc
      .fontSize(FONTS.small.size)
      .fillColor(COLORS.lightText)
      .text('Meeting Summary Report', this.margins, headerY, { align: 'left' })
      .text(`Page ${this.currentPage + 1}`, this.margins, headerY, { align: 'right' });
    
    // Add header line
    this.doc
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(this.margins, headerY + 15)
      .lineTo(this.pageWidth - this.margins, headerY + 15)
      .stroke();
  }

  // Add page footer
  addPageFooter() {
    const footerY = this.pageHeight - 40;
    
    this.doc
      .fontSize(FONTS.caption.size)
      .fillColor(COLORS.lightText)
      .text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 
            this.margins, footerY, { align: 'center' });
  }

  // Check if we need a new page
  checkPageBreak(requiredHeight = 50) {
    if (this.yPosition + requiredHeight > this.pageHeight - 80) {
      this.addPage();
      this.yPosition = this.margins + 50; // Account for header
    }
  }

  // Enhanced title with background and styling
  addTitle(title) {
    this.doc.addPage();
    
    // Add background gradient effect
    this.doc
      .rect(0, 0, this.pageWidth, 150)
      .fillColor(COLORS.primary)
      .fill();
    
    // Add title with white text
    this.doc
      .fontSize(FONTS.title.size)
      .fillColor('#ffffff')
      .text(title, this.margins, 60, { 
        align: 'center',
        width: this.pageWidth - 2 * this.margins
      });
    
    // Add subtitle
    this.doc
      .fontSize(FONTS.body.size)
      .fillColor('#ffffff')
      .text('Comprehensive Meeting Analysis & Action Items', this.margins, 95, { 
        align: 'center',
        width: this.pageWidth - 2 * this.margins
      });
    
    this.yPosition = 180;
    this.addPageFooter();
  }

  // Enhanced section header
  addSectionHeader(title, icon = '●') {
    this.checkPageBreak(40);
    
    // Add colored background bar
    this.doc
      .rect(this.margins - 10, this.yPosition - 5, this.pageWidth - 2 * this.margins + 20, 25)
      .fillColor(COLORS.background)
      .fill();
    
    // Add section title
    this.doc
      .fontSize(FONTS.heading.size)
      .fillColor(COLORS.primary)
      .text(`${icon} ${title}`, this.margins, this.yPosition, { 
        width: this.pageWidth - 2 * this.margins 
      });
    
    this.yPosition += 35;
  }

  // Enhanced text with better formatting
  addText(text, options = {}) {
    const defaultOptions = {
      fontSize: FONTS.body.size,
      color: COLORS.text,
      indent: 0,
      bulletPoint: false,
      lineHeight: 1.4
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Calculate required height
    const textHeight = this.doc.heightOfString(text, {
      width: this.pageWidth - 2 * this.margins - opts.indent,
      fontSize: opts.fontSize,
      lineGap: opts.lineHeight
    });
    
    this.checkPageBreak(textHeight + 10);
    
    // Add bullet point if needed
    if (opts.bulletPoint) {
      this.doc
        .fontSize(opts.fontSize)
        .fillColor(COLORS.accent)
        .text('•', this.margins + opts.indent, this.yPosition);
      opts.indent += 15;
    }
    
    // Add text
    this.doc
      .fontSize(opts.fontSize)
      .fillColor(opts.color)
      .text(text, this.margins + opts.indent, this.yPosition, {
        width: this.pageWidth - 2 * this.margins - opts.indent,
        lineGap: opts.lineHeight
      });
    
    this.yPosition += textHeight + 10;
  }

  // Add info box with border
  addInfoBox(title, content, type = 'info') {
    this.checkPageBreak(60);
    
    const boxColors = {
      info: { bg: '#eff6ff', border: COLORS.primary },
      success: { bg: '#ecfdf5', border: COLORS.success },
      warning: { bg: '#fffbeb', border: COLORS.warning },
      error: { bg: '#fef2f2', border: COLORS.error }
    };
    
    const color = boxColors[type] || boxColors.info;
    
    // Calculate box height
    const contentHeight = this.doc.heightOfString(content, {
      width: this.pageWidth - 2 * this.margins - 20,
      fontSize: FONTS.body.size
    });
    
    const boxHeight = contentHeight + 40;
    
    // Draw box
    this.doc
      .rect(this.margins, this.yPosition, this.pageWidth - 2 * this.margins, boxHeight)
      .fillColor(color.bg)
      .fill()
      .strokeColor(color.border)
      .lineWidth(1)
      .stroke();
    
    // Add title
    this.doc
      .fontSize(FONTS.subheading.size)
      .fillColor(color.border)
      .text(title, this.margins + 10, this.yPosition + 10);
    
    // Add content
    this.doc
      .fontSize(FONTS.body.size)
      .fillColor(COLORS.text)
      .text(content, this.margins + 10, this.yPosition + 30, {
        width: this.pageWidth - 2 * this.margins - 20
      });
    
    this.yPosition += boxHeight + 15;
  }

  // Add statistics summary
  addStatistics(stats) {
    this.checkPageBreak(100);
    
    const statItems = [
      { label: 'Total Participants', value: stats.participants || 'N/A' },
      { label: 'Meeting Duration', value: stats.duration || 'N/A' },
      { label: 'Action Items', value: stats.actionItems || 0 },
      { label: 'Key Points', value: stats.keyPoints || 0 }
    ];
    
    const boxWidth = (this.pageWidth - 2 * this.margins - 30) / 4;
    const boxHeight = 60;
    
    statItems.forEach((stat, index) => {
      const x = this.margins + index * (boxWidth + 10);
      
      // Draw stat box
      this.doc
        .rect(x, this.yPosition, boxWidth, boxHeight)
        .fillColor(COLORS.background)
        .fill()
        .strokeColor(COLORS.border)
        .lineWidth(1)
        .stroke();
      
      // Add value
      this.doc
        .fontSize(FONTS.heading.size)
        .fillColor(COLORS.primary)
        .text(stat.value.toString(), x + 5, this.yPosition + 10, {
          width: boxWidth - 10,
          align: 'center'
        });
      
      // Add label
      this.doc
        .fontSize(FONTS.small.size)
        .fillColor(COLORS.text)
        .text(stat.label, x + 5, this.yPosition + 35, {
          width: boxWidth - 10,
          align: 'center'
        });
    });
    
    this.yPosition += boxHeight + 20;
  }

  // Add table of contents
  addTableOfContents(sections) {
    this.addSectionHeader('Table of Contents', '📋');
    
    sections.forEach((section, index) => {
      this.doc
        .fontSize(FONTS.body.size)
        .fillColor(COLORS.text)
        .text(`${index + 1}. ${section.title}`, this.margins + 20, this.yPosition, {
          width: this.pageWidth - 2 * this.margins - 100
        });
      
      // Add dots
      const dots = '...................................';
      this.doc
        .fontSize(FONTS.body.size)
        .fillColor(COLORS.lightText)
        .text(dots, this.margins + 200, this.yPosition, {
          width: this.pageWidth - 2 * this.margins - 250
        });
      
      // Add page number
      this.doc
        .fontSize(FONTS.body.size)
        .fillColor(COLORS.text)
        .text(section.page.toString(), this.margins, this.yPosition, {
          width: this.pageWidth - 2 * this.margins,
          align: 'right'
        });
      
      this.yPosition += 20;
    });
  }
}

export async function generateMeetingSummaryPDF(meetingData) {
  return new Promise((resolve, reject) => {
    try {
      const generator = new EnhancedPDFGenerator();
      generator.initialize();
      
      const fileName = `meeting-summary-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pdf`;
      const filePath = join(EXPORT_DIR, fileName);
      const stream = generator.doc.pipe(createWriteStream(filePath));
      
      // Generate PDF content
      generator.addTitle('Meeting Summary Report');
      
      // Add meeting info
      generator.addInfoBox('Meeting Information', 
        `Date: ${meetingData.date || new Date().toLocaleDateString()}\n` +
        `Duration: ${meetingData.duration || 'Not specified'}\n` +
        `Participants: ${meetingData.participants || 'Not specified'}`,
        'info'
      );
      
      // Add statistics
      generator.addStatistics({
        participants: meetingData.participants?.split(',').length || 'N/A',
        duration: meetingData.duration || 'N/A',
        actionItems: meetingData.actionItems?.length || 0,
        keyPoints: meetingData.summary?.keyPoints?.length || 0
      });
      
      // Add table of contents
      const sections = [
        { title: 'Executive Summary', page: 3 },
        { title: 'Key Points', page: 4 },
        { title: 'Action Items', page: 5 },
        { title: 'Follow-up Message', page: 6 },
        { title: 'Full Transcript', page: 7 }
      ];
      generator.addTableOfContents(sections);
      
      // Add executive summary
      generator.addPage();
      generator.addSectionHeader('Executive Summary', '📊');
      generator.addText(meetingData.summary?.fullSummary || 'No summary available', {
        fontSize: FONTS.body.size,
        lineHeight: 1.6
      });
      
      // Add key points
      generator.addPage();
      generator.addSectionHeader('Key Points', '🎯');
      if (meetingData.summary?.keyPoints?.length > 0) {
        meetingData.summary.keyPoints.forEach((point, index) => {
          generator.addText(`${index + 1}. ${point}`, {
            fontSize: FONTS.body.size,
            bulletPoint: false,
            indent: 0
          });
        });
      } else {
        generator.addText('No key points identified', { 
          color: COLORS.lightText,
          fontSize: FONTS.body.size 
        });
      }
      
      // Add action items
      generator.addPage();
      generator.addSectionHeader('Action Items', '✅');
      if (meetingData.actionItems?.length > 0) {
        meetingData.actionItems.forEach((item, index) => {
          generator.addInfoBox(`Action Item ${index + 1}`, item, 'success');
        });
      } else {
        generator.addText('No action items identified', { 
          color: COLORS.lightText,
          fontSize: FONTS.body.size 
        });
      }
      
      // Add follow-up message
      generator.addPage();
      generator.addSectionHeader('Suggested Follow-up Message', '📧');
      generator.addInfoBox('Email Template', meetingData.followUp || 'No follow-up message generated', 'info');
      
      // Add original transcript
      generator.addPage();
      generator.addSectionHeader('Full Transcript', '📝');
      generator.addText(meetingData.originalText || 'No transcript available', {
        fontSize: FONTS.small.size,
        color: COLORS.text,
        lineHeight: 1.3
      });
      
      // Finalize PDF
      generator.doc.end();
      
      stream.on('finish', () => {
        resolve({ 
          fileName, 
          filePath,
          fileSize: require('fs').statSync(filePath).size,
          pages: generator.currentPage + 1
        });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Additional utility function for bulk PDF generation
export async function generateBulkMeetingSummaries(meetingDataArray) {
  const results = [];
  
  for (const meetingData of meetingDataArray) {
    try {
      const result = await generateMeetingSummaryPDF(meetingData);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        meetingId: meetingData.id || 'unknown'
      });
    }
  }
  
  return results;
}

// Utility function to merge multiple PDFs
export async function mergePDFs(pdfPaths, outputFileName) {
  // This would require an additional library like pdf-lib
  // Implementation depends on specific requirements
  console.log('PDF merging functionality would require pdf-lib or similar library');
}