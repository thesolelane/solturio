import { Request, Response, NextFunction } from "express";

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Optional auth middleware (continues even if not authenticated)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just continue - req.user will be undefined if not authenticated
  next();
}