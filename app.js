import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { EventEmitter } from "events";

// Set max listeners
EventEmitter.defaultMaxListeners = 15;

// Import routes
import userRoutes from "./src/routes/userRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import registrationRoutes from "./src/routes/registrationRoutes.js";
import feedbackRoutes from "./src/routes/feedbackRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import memberRoutes from "./src/routes/memberRoutes.js";
import teamRoutes from "./src/routes/teamRoutes.js";
import organizerRoutes from "./src/routes/organizerRoutes.js";

// Import middleware
import { authMiddleware } from "./src/middlewares/authMiddleware.js"; // Import as named export
import {
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
} from "./src/middlewares/securityMiddleware.js";
// Update Redis import
import { cache } from "./src/config/redis.js";

import { getMongoConnectionStatus } from "./src/utils/dbStatus.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Update CORS configuration to handle multiple origins
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",")
        : ["http://localhost:5173", "http://localhost:5174"];

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(compression());

// Logging in development environment
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

if (process.env.NODE_ENV === "production") {
  // Apply security middleware individually
  app.use(helmetMiddleware);
  app.use(mongoSanitizeMiddleware);
  app.use(xssMiddleware);
  app.use(hppMiddleware);
}

// Static files
app.use(express.static("public"));

// API routes
// Add organizer routes before other routes for proper middleware execution
app.use("/api/v1/organizer", organizerRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/teams", teamRoutes);

// Health check route
app.get("/health", async (req, res) => {
  try {
    // Test Redis connection
    await cache.set("health-check", "ok", 10);
    const redisStatus =
      (await cache.get("health-check")) === "ok" ? "connected" : "error";

    res.status(200).json({
      status: "ok",
      message: "Server is running",
      redis: redisStatus,
      mongodb: getMongoConnectionStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Service partially degraded",
      redis: "disconnected",
      mongodb: getMongoConnectionStatus(),
      timestamp: new Date().toISOString(),
    });
  }
});

// Database connection status endpoint
app.get("/api/v1/db-status", (req, res) => {
  const status = getMongoConnectionStatus();
  res.json({
    status: status === "connected" ? "ok" : "degraded",
    dbConnection: status,
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Cyber Hunter Event API",
    version: "1.0.0",
    documentation: "/api-docs",
  });
});

// Error handling middleware - Add this before 404 handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle specific errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      details: err.details,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      status: "error",
      message: "Invalid token",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("SIGTERM signal received: closing HTTP server");
  // Close Redis connection
  if (cache?.client?.quit) {
    cache.client.quit();
  }
  // Close other connections here
  process.exit(0);
};

// Handle different termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown();
});

export default app;
