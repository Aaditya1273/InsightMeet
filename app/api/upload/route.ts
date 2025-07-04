import { createRouteHandler } from "uploadthing/next";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

const uploadthingHandler = {
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
    // For now, we'll just return the file key and URL
    return {
      fileUrl: file.url,
      fileName: file.name,
      fileType: file.type
    };
  }),
} satisfies FileRouter;

export const { GET, POST } = createRouteHandler({
  router: uploadthingHandler,
});
