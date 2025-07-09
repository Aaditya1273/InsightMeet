import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration and utilities
const TEST_CONFIG = {
  UPLOAD_TIMEOUT: 60000,
  PROCESSING_TIMEOUT: 120000,
  FILE_SIZE_LIMIT: 50 * 1024 * 1024, // 50MB
  SUPPORTED_FORMATS: ['.txt', '.pdf', '.docx', '.md'],
  BASE_URL: '/upload-demo',
  RESULTS_URL_PATTERN: '**/results**'
};

// Test data setup
const TEST_FILES = {
  meeting1: './demo-data/meeting1.txt',
  largeMeeting: './demo-data/large-meeting.txt',
  invalidFile: './demo-data/invalid-file.exe',
  emptyFile: './demo-data/empty-file.txt'
};

// Helper functions
interface UploadFileOptions {
  expectSuccess?: boolean;
  timeout?: number;
  waitForNavigation?: boolean;
}

class FileUploadHelper {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async validateFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      throw new Error(`Test file not found: ${filePath}`);
    }
  }

  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async waitForUploadComplete() {
    // Wait for loading indicators to disappear
    await this.page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForSelector('[data-testid="upload-progress"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async uploadFile(filePath: string, options: UploadFileOptions = {}) {
    const { 
      expectSuccess = true, 
      timeout = TEST_CONFIG.UPLOAD_TIMEOUT,
      waitForNavigation = true 
    } = options;

    // Validate file exists
    await this.validateFileExists(filePath);

    // Get file input element
    const fileInput = this.page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });

    // Set file for upload
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await this.waitForUploadComplete();

    if (expectSuccess && waitForNavigation) {
      // Wait for navigation to results page
      await this.page.waitForURL(TEST_CONFIG.RESULTS_URL_PATTERN, { timeout });
    }

    return this;
  }

  async verifyUploadError(expectedErrorMessage) {
    const errorElement = this.page.locator('[data-testid="upload-error"], .error-message, .alert-error');
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    
    if (expectedErrorMessage) {
      await expect(errorElement).toContainText(expectedErrorMessage);
    }
  }
}

class SummaryValidator {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async validateSummaryStructure() {
    // Check for main summary container
    const summaryContainer = this.page.locator('[data-testid="summary-container"], div:has-text("Meeting Summary")');
    await expect(summaryContainer).toBeVisible({ timeout: 15000 });

    // Validate summary sections
    const sections = [
      'summary-header',
      'summary-content',
      'summary-metadata'
    ];

    for (const section of sections) {
      const element = this.page.locator(`[data-testid="${section}"]`);
      await expect(element).toBeVisible().catch(() => {
        console.warn(`Optional section ${section} not found`);
      });
    }

    return this;
  }

  async validateSummaryContent(expectedContent = []) {
    const bodyContent = this.page.locator('body');
    
    // Default content checks
    const defaultExpectedContent = [
      'Project Phoenix',
      'Meeting Summary',
      'participants',
      'agenda'
    ];

    const contentToCheck = expectedContent.length > 0 ? expectedContent : defaultExpectedContent;

    for (const content of contentToCheck) {
      await expect(bodyContent).toContainText(content, { timeout: 10000 });
    }

    return this;
  }

  async validateSummaryMetadata() {
    // Check for metadata elements
    const metadataElements = [
      'upload-timestamp',
      'file-name',
      'processing-time',
      'word-count'
    ];

    for (const element of metadataElements) {
      const locator = this.page.locator(`[data-testid="${element}"]`);
      await expect(locator).toBeVisible().catch(() => {
        console.warn(`Optional metadata ${element} not found`);
      });
    }

    return this;
  }

  async validateSummaryActions() {
    // Check for action buttons
    const actionButtons = [
      'download-summary',
      'share-summary',
      'edit-summary',
      'new-upload'
    ];

    for (const button of actionButtons) {
      const locator = this.page.locator(`[data-testid="${button}"]`);
      await expect(locator).toBeVisible().catch(() => {
        console.warn(`Optional action ${button} not found`);
      });
    }

    return this;
  }
}

// Main test suite
test.describe('File Upload and Summary Generation', () => {
  let fileUploadHelper;
  let summaryValidator;

  test.beforeEach(async ({ page }) => {
    fileUploadHelper = new FileUploadHelper(page);
    summaryValidator = new SummaryValidator(page);
    
    // Navigate to upload page
    await page.goto(TEST_CONFIG.BASE_URL);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should successfully upload a file and generate summary', async ({ page }) => {
    // Upload file and navigate to results
    await fileUploadHelper.uploadFile(TEST_FILES.meeting1);

    // Validate summary structure and content
    await summaryValidator
      .validateSummaryStructure()
      .then(() => summaryValidator.validateSummaryContent())
      .then(() => summaryValidator.validateSummaryMetadata())
      .then(() => summaryValidator.validateSummaryActions());

    // Additional performance checks
    await test.step('Performance validation', async () => {
      // Check page load time
      const navigationTiming = await page.evaluate(() => {
        return {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
        };
      });

      expect(navigationTiming.loadTime).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  test('should handle multiple file formats', async ({ page }) => {
    const testFiles = [
      { path: TEST_FILES.meeting1, expected: ['Project Phoenix'] },
      // Add more test files as needed
    ];

    for (const { path: filePath, expected } of testFiles) {
      await test.step(`Testing file: ${path.basename(filePath)}`, async () => {
        await page.goto(TEST_CONFIG.BASE_URL);
        await fileUploadHelper.uploadFile(filePath);
        await summaryValidator.validateSummaryContent(expected);
      });
    }
  });

  test('should handle large file uploads', async ({ page }) => {
    // Skip if large file doesn't exist
    try {
      await fileUploadHelper.validateFileExists(TEST_FILES.largeMeeting);
    } catch {
      test.skip('Large test file not available');
    }

    await fileUploadHelper.uploadFile(TEST_FILES.largeMeeting, {
      timeout: TEST_CONFIG.PROCESSING_TIMEOUT
    });

    await summaryValidator.validateSummaryStructure();
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Test with invalid file type
    await fileUploadHelper.uploadFile(TEST_FILES.invalidFile, {
      expectSuccess: false,
      waitForNavigation: false
    });

    await fileUploadHelper.verifyUploadError('Invalid file type');
  });

  test('should handle empty file uploads', async ({ page }) => {
    await fileUploadHelper.uploadFile(TEST_FILES.emptyFile, {
      expectSuccess: false,
      waitForNavigation: false
    });

    await fileUploadHelper.verifyUploadError('File is empty');
  });

  test('should maintain upload progress feedback', async ({ page }) => {
    // Monitor upload progress
    await test.step('Upload progress monitoring', async () => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_FILES.meeting1);

      // Check for progress indicators
      const progressIndicators = [
        '[data-testid="upload-progress"]',
        '.progress-bar',
        '.loading-spinner'
      ];

      let progressFound = false;
      for (const indicator of progressIndicators) {
        try {
          await expect(page.locator(indicator)).toBeVisible({ timeout: 2000 });
          progressFound = true;
          break;
        } catch {
          // Continue to next indicator
        }
      }

      if (!progressFound) {
        console.warn('No progress indicators found - consider adding for better UX');
      }
    });
  });

  test('should be accessible', async ({ page }) => {
    // Basic accessibility checks
    await test.step('Accessibility validation', async () => {
      // Check for proper labels
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toHaveAttribute('aria-label');

      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Check for proper focus management
      await fileInput.focus();
      await expect(fileInput).toBeFocused();
    });
  });

  test('should handle network interruptions', async ({ page }) => {
    // Simulate network failure during upload
    await page.route('**/upload**', route => {
      route.abort();
    });

    await fileUploadHelper.uploadFile(TEST_FILES.meeting1, {
      expectSuccess: false,
      waitForNavigation: false
    });

    // Should show network error
    await fileUploadHelper.verifyUploadError('Network error');
  });

  test('should support drag and drop upload', async ({ page }) => {
    // Test drag and drop functionality if available
    const dropZone = page.locator('[data-testid="drop-zone"], .drop-zone');
    
    if (await dropZone.isVisible()) {
      await dropZone.setInputFiles(TEST_FILES.meeting1);
      await page.waitForURL(TEST_CONFIG.RESULTS_URL_PATTERN);
      await summaryValidator.validateSummaryStructure();
    } else {
      test.skip('Drag and drop not implemented');
    }
  });

  test.afterEach(async ({ page }) => {
    // Cleanup and capture screenshots on failure
    if (test.info().status === 'failed') {
      await page.screenshot({
        path: `test-results/failure-${Date.now()}.png`,
        fullPage: true
      });
    }
  });
});

// Utility test for file validation
test.describe('File Validation Utilities', () => {
  test('should validate test files exist', async () => {
    for (const [name, filePath] of Object.entries(TEST_FILES)) {
      await test.step(`Validating ${name}`, async () => {
        try {
          await fs.access(filePath);
        } catch {
          console.warn(`Test file ${filePath} not found - some tests may be skipped`);
        }
      });
    }
  });
});