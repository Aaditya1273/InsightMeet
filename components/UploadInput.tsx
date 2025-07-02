import { UploadButton, UploadDropzone } from "@uploadthing/react";
import { useState, useCallback } from 'react';
import { OurFileRouter } from "@/app/api/uploadthing/core"; // Assuming your UploadThing config is here

interface UploadInputProps {
  onUploadSuccess?: (files: { name: string; url: string; size: number }[]) => void;
  onUploadError?: (error: Error) => void;
}

export function UploadInput({
  onUploadSuccess,
  onUploadError,
}: UploadInputProps) {
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string; size: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = useCallback(
    (res: { name: string; url: string; size: number }[]) => {
      setUploadedFiles(res);
      setUploading(false);
      setError(null);
      if (onUploadSuccess) {
        onUploadSuccess(res);
      }
      // TODO: Trigger backend processing with res[0].url
      console.log("Files:", res);
      alert("Upload Completed");
    },
    [onUploadSuccess]
  );

  const handleUploadError = useCallback(
    (error: Error) => {
      setError(error.message);
      setUploading(false);
      if (onUploadError) {
        onUploadError(error);
      }
      console.error("Upload Error:", error);
      alert(`Upload failed: ${error.message}`);
    },
    [onUploadError]
  );

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <UploadDropzone<OurFileRouter>
        endpoint="mediaUploader" // Replace with your actual endpoint name
        onClientUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        onUploadBegin={() => {
          setUploading(true);
          setError(null);
        }}
        // Apply Tailwind classes to the internal elements if possible, or wrap with divs
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
        // You might need to use the `content` prop or wrap the component to style the inner elements
      />

      {uploading && <p className="mt-4 text-blue-500">Uploading...</p>}
      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {uploadedFiles.length > 0 && (
        <div className="mt-4 w-full">
          <h3 className="text-lg font-semibold">Uploaded Files:</h3>
          <ul className="list-disc list-inside">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="text-sm text-gray-700">
                {file.name} ({Math.round(file.size / 1024)} KB) - Success
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
