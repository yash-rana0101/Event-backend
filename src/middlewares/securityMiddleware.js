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

export const loginLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit to 5 login attempts per hour
  message: "Too many login attempts, please try again after an hour",
});

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
