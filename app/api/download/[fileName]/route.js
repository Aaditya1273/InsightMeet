import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(request, { params }) {
  const { fileName } = params;
  
  if (!fileName) {
    return new NextResponse('File name is required', { status: 400 });
  }

  try {
    const filePath = join(process.cwd(), 'exports', fileName);
    
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (fileExtension === 'pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === 'ics') {
      contentType = 'text/calendar';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      contentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
    } else if (fileExtension === 'txt' || fileExtension === 'md') {
      contentType = 'text/plain';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
