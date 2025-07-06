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
    console.log("Upload complete for userId:", metadata.userId);
 
    console.log("file url", file.url);
    console.log("file key", file.key);
 
    // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
    return { uploadedBy: metadata.userId, fileKey: file.key };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;