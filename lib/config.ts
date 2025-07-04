/**
 * Application configuration
 */

export const config = {
  // API endpoints
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    endpoints: {
      upload: '/upload',
      summary: '/summary',
      email: '/email',
      calendar: '/calendar',
    },
    // Default timeout for API requests in milliseconds
    timeout: 30000,
  },

  // File upload configuration
  upload: {
    // Maximum file size in bytes (50MB)
    maxFileSize: 50 * 1024 * 1024,
    // Allowed file types
    allowedFileTypes: [
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/mpeg',
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    // File type extensions for display
    fileExtensions: ['.mp3', '.wav', '.m4a', '.txt', '.pdf', '.doc', '.docx'],
  },

  // Email configuration
  email: {
    from: 'InsightMeet <notifications@insightmeet.app>',
    replyTo: 'support@insightmeet.app',
  },

  // Meeting summary defaults
  summary: {
    defaultTitle: 'Untitled Meeting',
    defaultDuration: 60, // in minutes
  },

  // UI configuration
  ui: {
    // Number of items to show before "Show more"
    defaultVisibleItems: 3,
    // Toast notification duration in milliseconds
    toastDuration: 5000,
    // Animation durations in milliseconds
    animationDurations: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
  },

  // Feature flags
  features: {
    emailNotifications: process.env.NEXT_PUBLIC_FEATURE_EMAIL === 'true',
    calendarIntegration: process.env.NEXT_PUBLIC_FEATURE_CALENDAR === 'true',
    pdfExport: process.env.NEXT_PUBLIC_FEATURE_PDF_EXPORT === 'true',
  },

  // Environment
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

/**
 * Get the full URL for an API endpoint
 */
export function getApiUrl(endpoint: keyof typeof config.api.endpoints): string {
  return `${config.api.baseUrl}${config.api.endpoints[endpoint]}`;
}

/**
 * Get the MIME type for a file extension
 */
export function getMimeType(extension: string): string | undefined {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.m4a': 'audio/m4a',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  return mimeTypes[extension.toLowerCase()];
}

/**
 * Get the file extension from a MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string | undefined {
  const extensions: Record<string, string> = {
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/m4a': '.m4a',
    'audio/mpeg': '.mp3',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  
  return extensions[mimeType.toLowerCase()];
}

/**
 * Validate if a file is allowed based on its type and size
 */
export function isValidFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.upload.maxFileSize) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${config.upload.maxFileSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const mimeType = getMimeType(fileExtension);
  
  if (!mimeType || !config.upload.allowedFileTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${config.upload.fileExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}
