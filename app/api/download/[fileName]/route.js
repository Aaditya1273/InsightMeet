import { NextResponse } from 'next/server';
import { join, extname, basename, resolve } from 'path';
import { readFile, stat, createReadStream } from 'fs/promises';
import { existsSync, createReadStream as syncCreateReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { lookup } from 'mime-types';
import { Readable } from 'stream';

// Configuration
const CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_EXTENSIONS: [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'md', 'csv', 'json', 'xml',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'mp3', 'wav', 'avi', 'mov',
    'zip', 'rar', '7z', 'tar', 'gz',
    'ics', 'vcf', 'html', 'css', 'js'
  ],
  CACHE_CONTROL: {
    images: 'public, max-age=31536000, immutable', // 1 year
    documents: 'public, max-age=86400', // 1 day
    default: 'public, max-age=3600' // 1 hour
  },
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  }
};

// In-memory rate limiting (use Redis in production)
const rateLimitStore = new Map();

// Security utilities
function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validatePath(filePath, baseDir) {
  const resolvedPath = resolve(filePath);
  const resolvedBaseDir = resolve(baseDir);
  return resolvedPath.startsWith(resolvedBaseDir);
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

// Rate limiting middleware
function checkRateLimit(clientIp) {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIp) || { count: 0, resetTime: now + CONFIG.RATE_LIMIT.windowMs };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + CONFIG.RATE_LIMIT.windowMs;
  }
  
  if (clientData.count >= CONFIG.RATE_LIMIT.max) {
    return false;
  }
  
  clientData.count++;
  rateLimitStore.set(clientIp, clientData);
  return true;
}

// Enhanced MIME type detection
function getContentType(fileName) {
  const mimeType = lookup(fileName);
  if (mimeType) return mimeType;
  
  const ext = extname(fileName).toLowerCase().slice(1);
  const typeMap = {
    'ics': 'text/calendar',
    'vcf': 'text/vcard',
    'md': 'text/markdown',
    'log': 'text/plain',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  };
  
  return typeMap[ext] || 'application/octet-stream';
}

// Cache control based on file type
function getCacheControl(fileName) {
  const ext = extname(fileName).toLowerCase().slice(1);
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
  const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  
  if (imageExts.includes(ext)) return CONFIG.CACHE_CONTROL.images;
  if (documentExts.includes(ext)) return CONFIG.CACHE_CONTROL.documents;
  return CONFIG.CACHE_CONTROL.default;
}

// Generate ETag for caching
async function generateETag(filePath, stats) {
  const hash = createHash('md5');
  hash.update(filePath);
  hash.update(stats.mtime.toISOString());
  hash.update(stats.size.toString());
  return `"${hash.digest('hex')}"`;
}

// Stream large files
async function streamFile(filePath, response, range = null) {
  const stats = await stat(filePath);
  const fileSize = stats.size;
  
  if (range) {
    const [start, end] = range.split('-').map(Number);
    const chunkStart = start || 0;
    const chunkEnd = end || fileSize - 1;
    const chunkSize = chunkEnd - chunkStart + 1;
    
    const stream = syncCreateReadStream(filePath, { start: chunkStart, end: chunkEnd });
    
    return new Response(Readable.toWeb(stream), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
      },
    });
  }
  
  const stream = syncCreateReadStream(filePath);
  return new Response(Readable.toWeb(stream), {
    headers: {
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
}

// Security headers
function getSecurityHeaders(fileName) {
  const ext = extname(fileName).toLowerCase().slice(1);
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  
  // Additional security for executable files
  if (['js', 'html', 'htm', 'svg'].includes(ext)) {
    headers['Content-Security-Policy'] = "default-src 'none'";
  }
  
  return headers;
}

export async function GET(request, { params }) {
  const startTime = Date.now();
  const { fileName } = params;
  const url = new URL(request.url);
  
  // Input validation
  if (!fileName || typeof fileName !== 'string') {
    return new NextResponse('Invalid file name', { status: 400 });
  }
  
  // Rate limiting
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp)) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '900' // 15 minutes
      }
    });
  }
  
  try {
    // Sanitize and validate file name
    const sanitizedFileName = sanitizeFileName(fileName);
    const fileExtension = extname(sanitizedFileName).toLowerCase().slice(1);
    
    // Check allowed extensions
    if (!CONFIG.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return new NextResponse('File type not allowed', { status: 403 });
    }
    
    // Build file path
    const baseDir = join(process.cwd(), 'exports');
    const filePath = join(baseDir, sanitizedFileName);
    
    // Path traversal protection
    if (!validatePath(filePath, baseDir)) {
      return new NextResponse('Invalid file path', { status: 403 });
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Get file stats
    const stats = await stat(filePath);
    
    // Check file size
    if (stats.size > CONFIG.MAX_FILE_SIZE) {
      return new NextResponse('File too large', { status: 413 });
    }
    
    // Generate ETag
    const etag = await generateETag(filePath, stats);
    
    // Check if-none-match header (caching)
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }
    
    // Check if-modified-since header
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince) {
      const modifiedSince = new Date(ifModifiedSince);
      if (stats.mtime <= modifiedSince) {
        return new NextResponse(null, { status: 304 });
      }
    }
    
    // Get content type and cache control
    const contentType = getContentType(sanitizedFileName);
    const cacheControl = getCacheControl(sanitizedFileName);
    
    // Handle range requests for large files
    const rangeHeader = request.headers.get('range');
    if (rangeHeader && stats.size > 1024 * 1024) { // 1MB threshold
      const range = rangeHeader.replace('bytes=', '');
      const streamResponse = await streamFile(filePath, null, range);
      
      // Add headers to stream response
      streamResponse.headers.set('Content-Type', contentType);
      streamResponse.headers.set('ETag', etag);
      streamResponse.headers.set('Last-Modified', stats.mtime.toUTCString());
      streamResponse.headers.set('Cache-Control', cacheControl);
      
      // Add security headers
      Object.entries(getSecurityHeaders(sanitizedFileName)).forEach(([key, value]) => {
        streamResponse.headers.set(key, value);
      });
      
      return streamResponse;
    }
    
    // For smaller files, read into memory
    const fileBuffer = await readFile(filePath);
    
    // Prepare response headers
    const responseHeaders = {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'ETag': etag,
      'Last-Modified': stats.mtime.toUTCString(),
      'Cache-Control': cacheControl,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      ...getSecurityHeaders(sanitizedFileName)
    };
    
    // Handle download vs inline display
    const download = url.searchParams.get('download');
    if (download === 'true' || download === '1') {
      responseHeaders['Content-Disposition'] = `attachment; filename="${sanitizedFileName}"`;
    } else {
      // Try to display inline for supported types
      const inlineTypes = ['image/', 'text/', 'application/pdf'];
      const shouldDisplayInline = inlineTypes.some(type => contentType.startsWith(type));
      
      if (shouldDisplayInline) {
        responseHeaders['Content-Disposition'] = `inline; filename="${sanitizedFileName}"`;
      } else {
        responseHeaders['Content-Disposition'] = `attachment; filename="${sanitizedFileName}"`;
      }
    }
    
    return new NextResponse(fileBuffer, { headers: responseHeaders });
    
  } catch (error) {
    console.error('File serving error:', {
      fileName,
      error: error.message,
      stack: error.stack,
      clientIp,
      timestamp: new Date().toISOString()
    });
    
    // Don't expose internal errors
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    } else if (error.code === 'EACCES') {
      return new NextResponse('Access denied', { status: 403 });
    }
    
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// Optional: Add support for HEAD requests
export async function HEAD(request, { params }) {
  const response = await GET(request, { params });
  
  // Return headers only, no body
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers
  });
}

// Optional: Add support for OPTIONS (CORS)
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    }
  });
}