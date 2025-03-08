import { logError } from "./logger.js";

/**
 * Custom Error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Handle errors in async/await functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  // If not in production, keep the original error message and stack
  if (process.env.NODE_ENV !== "production" && !err.isOperational) {
    statusCode = 500;
    message = "Internal Server Error";
  }

  // Log error
  logError(message, {
    statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

/**
 * Centralized error handling for unhandled rejections and exceptions
 */
export const setupErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logError("Uncaught Exception", {
      error: error.message,
      stack: error.stack,
    });
    console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.error(error.name, error.message);
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", (error) => {
    logError("Unhandled Rejection", {
      error: error.message,
      stack: error.stack,
    });
    console.error("UNHANDLED REJECTION! 💥 Shutting down...");
    console.error(error.name, error.message);
    process.exit(1);
  });
};

export default {
  ApiError,
  catchAsync,
  errorHandler,
  setupErrorHandlers,
};
