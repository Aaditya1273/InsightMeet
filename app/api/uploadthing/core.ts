import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

// File route configuration
export const ourFileRouter = {
  meetingUploader: f({
    // Define file types and their limits
    audio: { maxFileSize: "128MB", maxFileCount: 1 },
    video: { maxFileSize: "128MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    text: { maxFileSize: "16MB", maxFileCount: 1 },
    // Add more file types as needed
  })
  .middleware(async ({ req }) => {
    // Add your authentication logic here
    // Example: const user = await getCurrentUser();
    // if (!user) throw new UploadThingError("Unauthorized");
    
    // Return metadata that will be available in onUploadComplete
    return { 
      userId: "user_123", // Replace with actual user ID
      userRole: "user"
    };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    // This code runs on the server after a successful upload
    console.log("Upload complete for user:", metadata.userId);
    console.log("File data:", { url: file.url, name: file.name, size: file.size });
    
    // Here you can:
    // 1. Save file metadata to your database
    // 2. Trigger any post-processing (e.g., AI analysis)
    // 3. Send notifications
    
    // Return any data you want to be available to the client
    return { 
      success: true,
      file: {
        url: file.url,
        name: file.name,
        size: file.size,
        key: file.key,
        type: file.type,
      },
      metadata
    };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;