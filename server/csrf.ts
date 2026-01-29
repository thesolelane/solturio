import { RequestHandler } from "express";
import crypto from "crypto";

// Extend Express Session to include CSRF token
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection.
 * This prevents malicious websites from making authenticated requests
 * to our API on behalf of logged-in users.
 * 
 * Security measures:
 * 1. sameSite='lax' cookie (prevents most CSRF attacks)
 * 2. CSRF token validation for state-changing operations
 * 3. Origin header validation
 */

const CSRF_TOKEN_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware to generate and set CSRF token
 * Attaches token to both cookie and makes it available to client
 */
export const setCsrfToken: RequestHandler = (req, res, next) => {
  // Generate new token if not present in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  // Set CSRF token in cookie (readable by JavaScript for inclusion in requests)
  res.cookie(CSRF_TOKEN_NAME, req.session.csrfToken, {
    httpOnly: false, // Must be readable by JS to include in request headers
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  });

  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Applies to POST, PUT, PATCH, DELETE methods
 */
export const validateCsrfToken: RequestHandler = (req, res, next) => {
  // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF validation for auth callback (OAuth flow)
  if (req.path === '/api/callback') {
    return next();
  }

  // Skip CSRF validation for extension API endpoints (they use JWT Bearer auth)
  if (req.path.startsWith('/api/extension/')) {
    return next();
  }

  const sessionToken = req.session.csrfToken;
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Validate token presence and match
  if (!sessionToken || !headerToken || sessionToken !== headerToken) {
    console.warn('CSRF token validation failed:', {
      path: req.path,
      method: req.method,
      hasSessionToken: !!sessionToken,
      hasHeaderToken: !!headerToken,
      tokensMatch: sessionToken === headerToken,
    });
    
    return res.status(403).json({ 
      message: 'Invalid CSRF token',
      error: 'CSRF_VALIDATION_FAILED'
    });
  }

  next();
};

/**
 * Middleware to validate request origin
 * Additional layer of defense against CSRF
 * SECURITY: Safely parses origins to prevent DoS from malformed headers
 */
export const validateOrigin: RequestHandler = (req, res, next) => {
  // Skip origin validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip origin validation for extension API endpoints (they use JWT Bearer auth)
  if (req.path.startsWith('/api/extension/')) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;

  // If no origin/referer headers, allow (could be API tools, mobile apps)
  // The CSRF token validation provides the main defense
  if (!origin && !referer) {
    return next();
  }

  // Safely parse origin header
  if (origin) {
    try {
      // Handle null, undefined, or malformed origins
      if (origin === 'null' || !origin.startsWith('http')) {
        // Reject suspicious origins
        console.warn('Invalid origin header:', { origin, path: req.path });
        return res.status(403).json({ 
          message: 'Invalid request origin',
          error: 'ORIGIN_VALIDATION_FAILED'
        });
      }
      
      const originHost = new URL(origin).host;
      if (originHost === host) {
        return next();
      }
    } catch (error) {
      // Malformed origin - reject rather than crash
      console.warn('Malformed origin header:', { origin, error, path: req.path });
      return res.status(403).json({ 
        message: 'Malformed request origin',
        error: 'ORIGIN_VALIDATION_FAILED'
      });
    }
  }

  // Safely parse referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) {
        return next();
      }
    } catch (error) {
      // Malformed referer - log but don't block (referer is less critical)
      console.warn('Malformed referer header:', { referer, error });
    }
  }

  // Origin/referer present but doesn't match - reject
  console.warn('Origin validation failed:', {
    path: req.path,
    method: req.method,
    origin,
    referer,
    host,
  });

  return res.status(403).json({ 
    message: 'Invalid request origin',
    error: 'ORIGIN_VALIDATION_FAILED'
  });
};

/**
 * Combined CSRF protection middleware
 * Use this on all authenticated routes that modify state
 */
export const csrfProtection: RequestHandler[] = [
  setCsrfToken,
  validateCsrfToken,
  validateOrigin,
];
