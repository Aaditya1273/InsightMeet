import { writeFile } from 'fs/promises';
import { join } from 'path';
import ics from 'ics';

const EXPORT_DIR = join(process.cwd(), 'exports');

// Ensure export directory exists
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

if (!existsSync(EXPORT_DIR)) {
  await mkdir(EXPORT_DIR, { recursive: true });
}

export async function generateCalendarEvent(eventData) {
  return new Promise((resolve, reject) => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setHours(startDate.getHours() + 1);

      const event = {
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ],
        title: eventData.title || 'Follow-up Meeting',
        description: eventData.description || 'Follow-up discussion based on previous meeting',
        location: eventData.location || 'Online',
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: { name: 'InsightMeet', email: 'noreply@insightmeet.app' },
      };

      ics.createEvent(event, async (error, value) => {
        if (error) {
          reject(error);
          return;
        }

        const fileName = `meeting-event-${Date.now()}.ics`;
        const filePath = join(EXPORT_DIR, fileName);

        try {
          await writeFile(filePath, value);
          resolve({ fileName, filePath });
        } catch (writeError) {
          reject(writeError);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
