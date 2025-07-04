import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadButton } from '@uploadthing/react';

const f = createUploadthing();

export const ourFileRouter = {
  meetingUploader: f({
    // Define file types and their limits
    audio: { maxFileSize: "128MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    text: { maxFileSize: "16MB", maxFileCount: 1 },
    // Use the correct file type names that UploadThing expects
    'application/msword': { maxFileSize: "16MB", maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: "16MB", maxFileCount: 1 }
  })
  .onUploadComplete(async ({ metadata, file }) => {
    // Here you can handle the uploaded file
    return {
      fileKey: file.key,
      ufsUrl: file.url
    };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
export { UploadButton };
