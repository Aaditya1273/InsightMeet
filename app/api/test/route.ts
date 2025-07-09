import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Types for better type safety
interface SystemInfo {
  timestamp: string;
  timezone: string;
  nodeVersion: string;
  platform: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface RequestInfo {
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  searchParams: Record<string, string>;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface APIResponse {
  success: boolean;
  message: string;
  timestamp: string;
  system: SystemInfo;
  request: RequestInfo;
  performance: PerformanceMetrics;
  tests: {
    database?: boolean;
    cache?: boolean;
    external?: boolean;
    auth?: boolean;
  };
  data?: any;
  debug?: any;
}

// Utility functions
const getSystemInfo = (): SystemInfo => {
  const memUsage = process.memoryUsage();
  return {
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'unknown',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    }
  };
};

const getRequestInfo = (request: NextRequest): RequestInfo => {
  const headersList = headers();
  const headersObj: Record<string, string> = {};
  
  headersList.forEach((value, key) => {
    headersObj[key] = value;
  });

  const url = new URL(request.url);
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });

  const cookies: Record<string, string> = {};
  request.cookies.getAll().forEach(cookie => {
    cookies[cookie.name] = cookie.value;
  });

  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    headers: headersObj,
    cookies,
    searchParams,
    geo: {
      country: request.headers.get('cf-ipcountry') || undefined,
      region: request.headers.get('cf-region') || undefined,
      city: request.headers.get('cf-ipcity') || undefined
    }
  };
};

// Health check functions
const testDatabase = async (): Promise<boolean> => {
  try {
    // Add your database connection test here
    // Example: await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database test failed:', error);
    return false;
  }
};

const testCache = async (): Promise<boolean> => {
  try {
    // Add your cache test here
    // Example: await redis.ping();
    return true;
  } catch (error) {
    console.error('Cache test failed:', error);
    return false;
  }
};

const testExternalAPI = async (): Promise<boolean> => {
  try {
    // Test external API connectivity
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.error('External API test failed:', error);
    return false;
  }
};

const testAuth = async (request: NextRequest): Promise<boolean> => {
  try {
    // Add your authentication test here
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    
    // Example JWT validation or API key check
    return authHeader.startsWith('Bearer ') || authHeader.startsWith('ApiKey ');
  } catch (error) {
    console.error('Auth test failed:', error);
    return false;
  }
};

// Performance monitoring
const measurePerformance = (startTime: number, startCpuUsage?: NodeJS.CpuUsage): PerformanceMetrics => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  return {
    responseTime,
    memoryUsage: process.memoryUsage(),
    cpuUsage: startCpuUsage ? process.cpuUsage(startCpuUsage) : undefined
  };
};

// Main handlers
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startCpuUsage = process.cpuUsage();

  try {
    const requestInfo = getRequestInfo(request);
    const mode = request.nextUrl.searchParams.get('mode') || 'basic';
    
    // Basic response
    if (mode === 'basic') {
      return NextResponse.json({
        success: true,
        message: "API working!",
        timestamp: new Date().toISOString()
      });
    }

    // Full diagnostic mode
    let tests = {};
    if (mode === 'full' || mode === 'health') {
      tests = {
        database: await testDatabase(),
        cache: await testCache(),
        external: await testExternalAPI(),
        auth: await testAuth(request)
      };
    }

    const response: APIResponse = {
      success: true,
      message: "Enhanced API Test Endpoint - All Systems Operational",
      timestamp: new Date().toISOString(),
      system: getSystemInfo(),
      request: requestInfo,
      performance: measurePerformance(startTime, startCpuUsage),
      tests,
      data: mode === 'debug' ? {
        environment: process.env,
        argv: process.argv,
        cwd: process.cwd(),
        versions: process.versions
      } : undefined
    };

    // Handle different response modes
    switch (mode) {
      case 'json':
        return NextResponse.json(response);
      case 'xml':
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
          <response>
            <success>${response.success}</success>
            <message>${response.message}</message>
            <timestamp>${response.timestamp}</timestamp>
          </response>`,
          { 
            headers: { 'Content-Type': 'application/xml' },
            status: 200 
          }
        );
      case 'text':
        return new NextResponse(
          `API Status: ${response.success ? 'OK' : 'ERROR'}\n` +
          `Message: ${response.message}\n` +
          `Timestamp: ${response.timestamp}\n` +
          `Response Time: ${response.performance.responseTime}ms`,
          { 
            headers: { 'Content-Type': 'text/plain' },
            status: 200 
          }
        );
      case 'health':
        const healthStatus = Object.values(tests).every(test => test === true);
        return NextResponse.json(response, { 
          status: healthStatus ? 200 : 503 
        });
      default:
        return NextResponse.json(response);
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: measurePerformance(startTime, startCpuUsage)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const requestInfo = getRequestInfo(request);
    
    // Echo service for testing POST requests
    return NextResponse.json({
      success: true,
      message: "POST request processed successfully",
      timestamp: new Date().toISOString(),
      echo: {
        receivedData: body,
        dataType: typeof body,
        dataSize: JSON.stringify(body).length
      },
      request: requestInfo,
      performance: measurePerformance(startTime)
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to process POST request",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: "PUT request processed - Resource updated",
      timestamp: new Date().toISOString(),
      updated: body,
      performance: measurePerformance(startTime)
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to process PUT request",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  
  return NextResponse.json({
    success: true,
    message: `DELETE request processed - Resource ${id || 'unknown'} deleted`,
    timestamp: new Date().toISOString(),
    deleted: { id: id || null }
  });
}

export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: "PATCH request processed - Resource partially updated",
      timestamp: new Date().toISOString(),
      patches: body,
      performance: measurePerformance(startTime)
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to process PATCH request",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}