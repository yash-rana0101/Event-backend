import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration variables with fallbacks for development
export const config = {
  jwtSecret: process.env.JWT_SECRET ,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/cyber-hunter",
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:5173",
    "http://localhost:5174",
  ],
};

// Helper function to validate config
export const validateConfig = () => {
  const requiredConfig = {
    jwtSecret: config.jwtSecret,
    mongoUri: config.mongoUri,
  };

  const missingConfig = Object.entries(requiredConfig)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingConfig.length > 0) {
    console.warn(`Missing required configuration: ${missingConfig.join(", ")}`);
    if (
      config.environment === "production" &&
      missingConfig.includes("jwtSecret")
    ) {
      throw new Error("JWT secret is required in production environment");
    }
  }

  // Add specific validation for mongoUri
  if (!config.mongoUri) {
    console.error("Missing required configuration: mongoUri");
    process.exit(1); // Exit the process if the critical config is missing
  }

  // Ensure JWT secret is available
  if (!config.jwtSecret) {
    console.error(
      "JWT_SECRET is not configured. Using fallback for development only."
    );
    if (config.environment === "production") {
      throw new Error("JWT_SECRET is required in production environment");
    }
  }

  return true;
};

export default config;
