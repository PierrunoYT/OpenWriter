import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add Content-Security-Policy headers to responses
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set Content-Security-Policy header with appropriate directives
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ')
  );
  
  next();
};
