import app from "./app.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";

dotenv.config();

const PORT = process.env.PORT;
const MONGODB_URI =
  process.env.MONGODB_URI;

// Create an HTTP server
const server = createServer(app);

// Improved MongoDB connection with better error handling
const connectDB = async () => {
  try {
    // Add more robust connection options
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increase timeout for Atlas connection
      socketTimeoutMS: 45000, // Socket timeout
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Start server after successful DB connection
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);

    // Provide more specific error handling based on error type
    if (error.name === "MongoServerSelectionError") {
      console.log(
        "Could not connect to MongoDB server. Please check your connection string and ensure MongoDB is running."
      );
      console.log("Specific error:", error.message);

      // Try to suggest fixes based on the error
      if (error.message.includes("getaddrinfo ENOTFOUND")) {
        console.log("Host not found. Please check your MongoDB host name.");
      } else if (error.message.includes("ECONNREFUSED")) {
        console.log(
          "Connection refused. Check if MongoDB server is running on the specified host and port."
        );
      } else if (error.message.includes("Authentication failed")) {
        console.log("Authentication failed. Check your username and password.");
      }
    }

    console.log("Starting server without database connection...");

    // Start the server anyway to allow access to routes that don't need DB
    server.listen(PORT, () => {
      console.log(
        `Server running in limited mode on port ${PORT}. Some features may be unavailable.`
      );
    });
  }
};

// Connect to MongoDB
connectDB();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.info("SIGTERM signal received.");
  console.log("Closing HTTP server.");
  server.close(() => {
    console.log("HTTP server closed.");
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});
