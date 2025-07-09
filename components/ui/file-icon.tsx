import { File, FileText, Image, Music, Video } from 'lucide-react';

export const getFileIcon = (type: string) => {
  if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
  if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
  if (type.startsWith('text/')) return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
};
