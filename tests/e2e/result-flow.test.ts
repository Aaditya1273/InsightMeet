import { test, expect } from '@playwright/test';

test('should allow a user to upload a file and see the summary', async ({ page }) => {
  await page.goto('/upload-demo');

  // Wait for the upload component to be visible
  await page.waitForSelector('input[type="file"]');

  // The file path should be relative to the project root where Playwright is run
  const filePath = './demo-data/meeting1.txt';

  // Set the file for the input
  await page.setInputFiles('input[type="file"]', filePath);

  // Wait for the navigation to the results page
  await page.waitForURL('**/results**', { timeout: 60000 }); // 60 seconds timeout

  // Check if the summary view is visible
  const summaryView = page.locator('div:has-text("Meeting Summary")');
  await expect(summaryView).toBeVisible();

  // Check for some expected text in the summary
  await expect(page.locator('body')).toContainText('Project Phoenix');
});
