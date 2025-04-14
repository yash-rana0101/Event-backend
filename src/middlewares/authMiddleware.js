import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organizer from "../models/organizerModel.js";
import ApiResponse from "../utils/apiResponse.js";
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
        message: "Authentication required. No token provided.",
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
        message: "Invalid token structure",
        code: "INVALID_TOKEN_STRUCTURE",
      });
    }

    // Check if user exists
    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      // User found, attach to request
      req.user = user;
      next();
    } else {
      // No user found, try organizer
      const organizer = await Organizer.findById(decoded.id).select(
        "-password"
      );

      if (organizer) {
        // Organizer found, attach to request
        req.user = organizer;
        req.organizer = organizer;
        next();
      } else {
        // Neither user nor organizer found
        return res.status(401).json({
          message: "User not found for provided token",
          code: "USER_NOT_FOUND",
        });
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Provide more specific error messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format or signature",
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
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

    if (!token) {
      return res.status(401).json({
        message: "Organizer authentication required. No token provided.",
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
        message: "Invalid token structure",
        code: "INVALID_TOKEN_STRUCTURE",
      });
    }

    // Check if organizer exists
    const organizer = await Organizer.findById(decoded.id).select("-password");

    if (!organizer) {
      return res.status(401).json({
        message: "Organizer not found or invalid credentials",
        code: "ORGANIZER_NOT_FOUND",
      });
    }

    // Attach organizer to request
    req.user = organizer; // For compatibility
    req.organizer = organizer;
    next();
  } catch (error) {
    console.error("Organizer auth middleware error:", error);

    // Provide more specific error messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid organizer token",
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Organizer token expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      message: "Organizer authentication failed",
      code: "AUTH_FAILED",
      error: error.message,
    });
  }
};

// Admin auth middleware
export const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user exists (should be set by authMiddleware)
    if (!req.user) {
      return ApiResponse.unauthorized(
        res,
        "Access denied. Authentication required."
      );
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return ApiResponse.forbidden(
        res,
        "Access denied. Admin privileges required."
      );
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return ApiResponse.error(res, "Authentication failed.");
  }
};

// Export default as object with all middleware
export default {
  authMiddleware,
  verifyOrganizerToken,
  adminMiddleware,
};
