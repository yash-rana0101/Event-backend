import mongoose from "mongoose";

/**
 * Checks if the MongoDB connection is active
 * @returns {boolean} True if connected, false otherwise
 */
export const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Gets the current MongoDB connection state as a string
 * @returns {string} Connection state description
 */
export const getMongoConnectionStatus = () => {
  const state = mongoose.connection.readyState;

  switch (state) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
};

/**
 * Middleware to check database connection
 * Will return a 503 service unavailable if the database is not connected
 */
export const requireDbConnection = (req, res, next) => {
  if (!isMongoConnected()) {
    return res.status(503).json({
      status: "error",
      message: "Database service unavailable",
      details:
        "The application is running in limited mode due to database connection issues",
    });
  }
  next();
};
