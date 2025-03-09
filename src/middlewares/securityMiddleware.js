import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";

export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
};

// Create a disabled rate limiter that always allows requests
export const loginLimiter = (req, res, next) => {
  // Simply pass through without limiting
  next();
};

// For other routes if needed, keep rate limiting with higher values
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests, please try again later",
  },
});

// Disabled limiter for development
export const createDisabledLimiter = () => (req, res, next) => next();

// Export individual middleware functions
export const helmetMiddleware = helmet();
export const mongoSanitizeMiddleware = mongoSanitize();
export const xssMiddleware = xss();
export const hppMiddleware = hpp();

// Combine all security middleware
export const securityMiddleware = [
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
];
