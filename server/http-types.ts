import type { NextFunction, Request, Response } from "express";
import type { User } from "@shared/schema";

export interface AuthClaims {
  sub?: string;
  exp?: number;
}

export interface SessionUser {
  claims?: AuthClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface ExtensionSessionUser {
  userId: string;
  email?: string | null;
  scopes: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  adminUser?: User | null;
  requestId?: string;
}

export interface ExtensionAuthenticatedRequest extends Request {
  extensionUser?: ExtensionSessionUser;
  requestId?: string;
}

export type AppResponse = Response;
export type AppNextFunction = NextFunction;

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
