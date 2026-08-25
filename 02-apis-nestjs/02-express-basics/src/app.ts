import express, { type Express, type NextFunction, type Request, type Response } from "express";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: ValidationIssue[],
  ) {
    super(message);
  }
}

/**
 * Central error translator. Register AFTER your routes; late-mounted
 * routers must re-register it after themselves (Express searches forward
 * for error middleware only).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  throw new Error("TODO: implement errorHandler");
}

export interface CreateAppOptions {
  /**
   * Mount additional routers/middleware BEFORE the 404 catch-all and
   * error tail are registered — how real bootstraps compose feature
   * modules without losing centralized error handling.
   */
  attach?: (app: Express) => void;
}

/**
 * Build an independent, fully-wired app instance.
 * No .listen() here — bootstrap belongs to a separate entry file.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  throw new Error("TODO: implement createApp");
}

// Re-exports so tests (and you) can import everything from one module.
export type { Express, NextFunction, Request, Response };
