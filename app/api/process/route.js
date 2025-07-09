import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();

// Configuration
const CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  },
  cache: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60,
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  security: {
    requireApiKey: process.env.REQUIRE_API_KEY === 'true',
    apiKey: process.env.API_KEY,
  },
};

// Utility functions
const createResponse = (data, status = 200, headers = {}) => {
  return NextResponse.json(data, { 
    status, 
    headers: {
      'Cache-Control': `public, max-age=${CONFIG.cache.maxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}`,
      'X-Powered-By': 'Enhanced-API-v1.0',
      'X-Response-Time': Date.now().toString(),
      ...headers,
    }
  });
};

const createErrorResponse = (message, status = 500, code = 'INTERNAL_ERROR') => {
  return NextResponse.json({
    error: true,
    message,
    code,
    timestamp: new Date().toISOString(),
  }, { status });
};

// Rate limiting middleware
const rateLimit = (clientId) => {
  const now = Date.now();
  const windowStart = now - CONFIG.rateLimit.windowMs;
  
  if (!rateLimitStore.has(clientId)) {
    rateLimitStore.set(clientId, []);
  }
  
  const requests = rateLimitStore.get(clientId).filter(time => time > windowStart);
  
  if (requests.length >= CONFIG.rateLimit.maxRequests) {
    return false;
  }
  
  requests.push(now);
  rateLimitStore.set(clientId, requests);
  
  // Clean up old entries
  if (rateLimitStore.size > 1000) {
    const oldestAllowed = now - CONFIG.rateLimit.windowMs;
    for (const [key, times] of rateLimitStore.entries()) {
      const validTimes = times.filter(time => time > oldestAllowed);
      if (validTimes.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, validTimes);
      }
    }
  }
  
  return true;
};

// Authentication middleware
const authenticate = (request) => {
  if (!CONFIG.security.requireApiKey) return true;
  
  const apiKey = request.headers.get('X-API-Key') || 
                 request.headers.get('Authorization')?.replace('Bearer ', '');
  
  return apiKey === CONFIG.security.apiKey;
};

// CORS middleware
const handleCors = (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = CONFIG.cors.allowedOrigins;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': CONFIG.cors.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': CONFIG.cors.allowedHeaders.join(', '),
      'Access-Control-Max-Age': '86400',
    };
  }
  
  return null;
};

// Pagination utility
const getPaginationParams = (searchParams) => {
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
  const limit = Math.min(
    CONFIG.pagination.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit')) || CONFIG.pagination.defaultLimit)
  );
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

// Input validation
const validateInput = (data, schema) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }
  }
  
  return errors;
};

// Mock database operations (replace with real database)
const mockDatabase = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: '2024-01-02T00:00:00Z' },
  ],
  
  async find(filters = {}, pagination = {}) {
    let result = [...this.users];
    
    // Apply filters
    if (filters.name) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    
    if (filters.email) {
      result = result.filter(user => 
        user.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }
    
    // Apply pagination
    const total = result.length;
    const { offset, limit } = pagination;
    
    if (offset !== undefined && limit !== undefined) {
      result = result.slice(offset, offset + limit);
    }
    
    return {
      data: result,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
  
  async findById(id) {
    return this.users.find(user => user.id === parseInt(id));
  },
  
  async create(data) {
    const newUser = {
      id: Math.max(...this.users.map(u => u.id), 0) + 1,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  },
  
  async update(id, data) {
    const index = this.users.findIndex(user => user.id === parseInt(id));
    if (index === -1) return null;
    
    this.users[index] = { ...this.users[index], ...data, updatedAt: new Date().toISOString() };
    return this.users[index];
  },
  
  async delete(id) {
    const index = this.users.findIndex(user => user.id === parseInt(id));
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  },
};

// OPTIONS handler for CORS preflight
export async function OPTIONS(request) {
  const corsHeaders = handleCors(request);
  
  if (!corsHeaders) {
    return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
  }
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET handler - List resources with filtering, pagination, and search
export async function GET(request) {
  try {
    const startTime = Date.now();
    
    // CORS handling
    const corsHeaders = handleCors(request);
    if (!corsHeaders) {
      return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
    }
    
    // Authentication
    if (!authenticate(request)) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_ERROR');
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimit(clientId)) {
      return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pagination = getPaginationParams(searchParams);
    
    // Build filters
    const filters = {
      name: searchParams.get('name'),
      email: searchParams.get('email'),
    };
    
    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    // Fetch data
    const result = await mockDatabase.find(filters, pagination);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return createResponse({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      metadata: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('GET Error:', error);
    return createErrorResponse('Internal server error', 500, 'GET_ERROR');
  }
}

// POST handler - Create new resource
export async function POST(request) {
  try {
    // CORS handling
    const corsHeaders = handleCors(request);
    if (!corsHeaders) {
      return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
    }
    
    // Authentication
    if (!authenticate(request)) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_ERROR');
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimit(clientId)) {
      return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('Invalid JSON', 400, 'INVALID_JSON');
    }
    
    // Validation schema
    const schema = {
      name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      email: { 
        required: true, 
        type: 'string', 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      },
    };
    
    const validationErrors = validateInput(body, schema);
    if (validationErrors.length > 0) {
      return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', {
        errors: validationErrors,
      });
    }
    
    // Create resource
    const newResource = await mockDatabase.create(body);
    
    return createResponse({
      success: true,
      data: newResource,
      message: 'Resource created successfully',
    }, 201, corsHeaders);
    
  } catch (error) {
    console.error('POST Error:', error);
    return createErrorResponse('Internal server error', 500, 'POST_ERROR');
  }
}

// PUT handler - Update resource
export async function PUT(request) {
  try {
    // CORS handling
    const corsHeaders = handleCors(request);
    if (!corsHeaders) {
      return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
    }
    
    // Authentication
    if (!authenticate(request)) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_ERROR');
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimit(clientId)) {
      return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    }
    
    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createErrorResponse('ID parameter is required', 400, 'MISSING_ID');
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('Invalid JSON', 400, 'INVALID_JSON');
    }
    
    // Validation schema (partial update)
    const schema = {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      email: { 
        type: 'string', 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      },
    };
    
    const validationErrors = validateInput(body, schema);
    if (validationErrors.length > 0) {
      return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', {
        errors: validationErrors,
      });
    }
    
    // Update resource
    const updatedResource = await mockDatabase.update(id, body);
    
    if (!updatedResource) {
      return createErrorResponse('Resource not found', 404, 'NOT_FOUND');
    }
    
    return createResponse({
      success: true,
      data: updatedResource,
      message: 'Resource updated successfully',
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('PUT Error:', error);
    return createErrorResponse('Internal server error', 500, 'PUT_ERROR');
  }
}

// DELETE handler - Delete resource
export async function DELETE(request) {
  try {
    // CORS handling
    const corsHeaders = handleCors(request);
    if (!corsHeaders) {
      return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
    }
    
    // Authentication
    if (!authenticate(request)) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_ERROR');
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimit(clientId)) {
      return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    }
    
    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createErrorResponse('ID parameter is required', 400, 'MISSING_ID');
    }
    
    // Delete resource
    const deleted = await mockDatabase.delete(id);
    
    if (!deleted) {
      return createErrorResponse('Resource not found', 404, 'NOT_FOUND');
    }
    
    return createResponse({
      success: true,
      message: 'Resource deleted successfully',
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('DELETE Error:', error);
    return createErrorResponse('Internal server error', 500, 'DELETE_ERROR');
  }
}

// PATCH handler - Partial update
export async function PATCH(request) {
  try {
    // CORS handling
    const corsHeaders = handleCors(request);
    if (!corsHeaders) {
      return createErrorResponse('Origin not allowed', 403, 'CORS_ERROR');
    }
    
    // Authentication
    if (!authenticate(request)) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_ERROR');
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimit(clientId)) {
      return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    }
    
    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createErrorResponse('ID parameter is required', 400, 'MISSING_ID');
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('Invalid JSON', 400, 'INVALID_JSON');
    }
    
    // Validation schema (all fields optional for PATCH)
    const schema = {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      email: { 
        type: 'string', 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      },
    };
    
    const validationErrors = validateInput(body, schema);
    if (validationErrors.length > 0) {
      return createErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', {
        errors: validationErrors,
      });
    }
    
    // Update resource
    const updatedResource = await mockDatabase.update(id, body);
    
    if (!updatedResource) {
      return createErrorResponse('Resource not found', 404, 'NOT_FOUND');
    }
    
    return createResponse({
      success: true,
      data: updatedResource,
      message: 'Resource updated successfully',
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('PATCH Error:', error);
    return createErrorResponse('Internal server error', 500, 'PATCH_ERROR');
  }
}