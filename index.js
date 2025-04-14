import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config, validateConfig } from "./src/config/config.js";
import mongoose from "mongoose";
import userRoutes from "./src/routes/userRoutes.js";
import jwt from "jsonwebtoken"; // Add this import for JWT verification
import app from "./app.js";
// Import other routes as needed

// Validate configuration
validateConfig();

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server in running mode on port ${PORT}`);
});


// Connect to MongoDB
if (config.mongoUri) {
  mongoose
    .connect(config.mongoUri)
    .then(() => console.log("<-------------------------->"))
    .then(() => console.log("    MongoDB is connected    "))
    .then(() => console.log("<-------------------------->"))
    .catch((err) => console.error("MongoDB connection error:", err));
} else {
  console.error("MongoDB URI is not defined. Database connection skipped.");
}
