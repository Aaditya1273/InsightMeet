import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

export const utapi = new UTApi();

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  meetingUploader: f({
    // Accept audio and text files
    'audio/*': {
      maxFileSize: '16MB', // Adjust as needed
      maxFileCount: 1,
    },
    'text/plain': {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      // Return the file metadata
      return {
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
