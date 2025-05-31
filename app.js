import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { EventEmitter } from "events";

// Set max listeners to a higher value to avoid warnings
EventEmitter.defaultMaxListeners = 25; // Increased from 20 to 25

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
import userProfileRoutes from "./src/routes/userProfileRoutes.js";
import reviewRoutes from "./src/routes/reviewRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import settingsRoutes from "./src/routes/settings.js";
import authRoutes from "./src/routes/authRoutes.js";

// Import middleware
import { authMiddleware } from "./src/middlewares/authMiddleware.js";
import {
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
} from "./src/middlewares/securityMiddleware.js";

import { getMongoConnectionStatus } from "./src/utils/dbStatus.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Update CORS configuration to handle multiple origins
app.use(cors());

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
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/organizer", organizerRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/profiles", userProfileRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/settings", settingsRoutes); // Fixed path

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Event System Event API",
    version: "1.0.0",
    documentation: "/api-docs",
  });
});

// Error handling middleware
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
