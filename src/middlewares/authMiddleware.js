import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../models/User.js";
import Organizer from "../models/organizerModel.js";
import { config } from "../config/config.js";

// Helper to extract token from header
const getTokenFromHeader = (req) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Check if it follows Bearer token format
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  // Extract the token
  return authHeader.split(" ")[1];
};

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    // Log token for debugging (REMOVE IN PRODUCTION)
    console.log("Token received:", token.substring(0, 15) + "...");

    // Verify the token
    const decoded = jwt.verify(
      token,
      config.jwtSecret || process.env.JWT_SECRET
    );

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Check if user exists
    let user = await User.findById(decoded.id).select("-password");

    // If not found as user, try organizer
    if (!user) {
      user = await Organizer.findById(decoded.id).select("-password");
    }

    if (user) {
      // Attach user to request
      req.user = user;
      req.userType = user.constructor.modelName.toLowerCase();
      next();
    } else {
      return res.status(401).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Provide more specific error messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format",
        code: "INVALID_TOKEN_FORMAT",
        error: error.message,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
        error: error.message,
      });
    }

    return res.status(401).json({
      message: "Authentication failed",
      code: "AUTH_FAILED",
      error: error.message,
    });
  }
};

// Specific middleware for organizer routes
export const verifyOrganizerToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = getTokenFromHeader(req);
    console.log("hii");
    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      config.jwtSecret || process.env.JWT_SECRET
    );

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Check if organizer exists
    const organizer = await Organizer.findById(decoded.id).select("-password");

    if (!organizer) {
      return res.status(401).json({
        message: "Organizer not found or you don't have organizer privileges",
        code: "ORGANIZER_NOT_FOUND",
      });
    }

    // Attach organizer to request
    req.user = organizer;
    req.organizer = organizer;
    req.userType = "organizer";
    console.log("organizer", req.organizer);
    next();
  } catch (error) {
    console.error("Organizer auth middleware error:", error);

    // Provide more specific error messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format",
        code: "INVALID_TOKEN_FORMAT",
        error: error.message,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
        error: error.message,
      });
    }

    return res.status(401).json({
      message: "Organizer authentication failed",
      code: "AUTH_FAILED",
      error: error.message,
    });
  }
};

// Create a middleware that accepts either user or organizer
export const anyAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      config.jwtSecret || process.env.JWT_SECRET
    );

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // First try to find as a user
    let user = await User.findById(decoded.id).select("-password");
    let userType = "user";

    // If not found as user, try organizer
    if (!user) {
      user = await Organizer.findById(decoded.id).select("-password");
      userType = "organizer";
    }

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach user to request
    req.user = user;
    req.userType = userType;

    // For backward compatibility
    if (userType === "organizer") {
      req.organizer = user;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format",
        code: "INVALID_TOKEN_FORMAT",
        error: error.message,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
        error: error.message,
      });
    }

    return res.status(401).json({
      message: "Authentication failed",
      code: "AUTH_FAILED",
      error: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 * This middleware will attempt to authenticate the user but won't error if no token
 * or invalid token is provided. Instead, it will set req.user to null and continue.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    let token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
      // No token found, continue as unauthenticated
      req.user = null;
      req.organizer = null;
      return next();
    }

    // Extract token
    token = token.split(" ")[1];

    try {
      // Verify token
      const decoded = await promisify(jwt.verify)(
        token,
        config.jwtSecret || process.env.JWT_SECRET
      );

      // Check if user exists in our database
      const currentUser = await User.findById(decoded.id).select("-password");

      if (currentUser) {
        req.user = currentUser;
        req.organizer = null;
      } else {
        // Check if it's an organizer
        const currentOrganizer = await Organizer.findById(decoded.id);

        if (currentOrganizer) {
          req.organizer = currentOrganizer;
          req.user = null;
        } else {
          // User no longer exists
          req.user = null;
          req.organizer = null;
        }
      }
    } catch (err) {
      // Token verification failed, continue as unauthenticated
      req.user = null;
      req.organizer = null;
    }

    next();
  } catch (error) {
    // In case of other errors, continue as unauthenticated
    console.error("Optional auth error:", error);
    req.user = null;
    req.organizer = null;
    next();
  }
};

// Export as named exports and default object
export default {
  authMiddleware,
  verifyOrganizerToken,
  anyAuthMiddleware,
  getTokenFromHeader,
  optionalAuth,
};
