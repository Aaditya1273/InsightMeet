import { useCallback, useState } from 'react';
import { UploadCloud, FileText, FileAudio } from 'lucide-react';

type UploadProps = {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  acceptedFormats?: string[];
  maxSizeMB?: number;
};

export function Upload({
  onFileSelect,
  isLoading = false,
  acceptedFormats = ['.mp3', '.wav', '.m4a', '.txt', '.docx', '.pdf'],
  maxSizeMB = 50,
}: UploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const newFile = e.dataTransfer.files[0];
        if (validateFile(newFile)) {
          setFile(newFile);
          onFileSelect(newFile);
        }
      }
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const newFile = e.target.files[0];
      if (validateFile(newFile)) {
        setFile(newFile);
        onFileSelect(newFile);
      }
    }
  };

  const validateFile = (file: File): boolean => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidFormat = acceptedFormats.some(format => 
      file.name.toLowerCase().endsWith(format.toLowerCase())
    );
    
    if (!isValidFormat) {
      alert(`Invalid file format. Please upload one of: ${acceptedFormats.join(', ')}`);
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File is too large. Maximum size is ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const audioFormats = ['mp3', 'wav', 'm4a', 'ogg'];
    
    if (audioFormats.includes(extension || '')) {
      return <FileAudio className="h-5 w-5 text-muted-foreground" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors ${
          dragActive ? 'border-primary bg-accent/50' : 'hover:bg-accent/20'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="rounded-full bg-accent p-3 mb-4">
          <UploadCloud className="h-6 w-6 text-accent-foreground" />
        </div>
        <div className="text-sm text-muted-foreground">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer rounded-md font-medium text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/90"
          >
            <span>Upload a file</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleChange}
              accept={acceptedFormats.join(',')}
              disabled={isLoading}
            />
          </label>
          <p className="pl-1 inline">or drag and drop</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {acceptedFormats.join(', ')} up to {maxSizeMB}MB
        </p>
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="flex items-center space-x-3">
            {getFileIcon(file.name)}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
