import winston from "winston";
import path from "path";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ""
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    // Error log file transport
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file transport
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join("logs", "exceptions.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Create directory for logs if it doesn't exist
import fs from "fs";
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

export default logger;

// Convenience methods
export const logInfo = (message, meta = {}) => logger.info(message, meta);
export const logError = (message, meta = {}) => logger.error(message, meta);
export const logWarning = (message, meta = {}) => logger.warn(message, meta);
export const logDebug = (message, meta = {}) => logger.debug(message, meta);
