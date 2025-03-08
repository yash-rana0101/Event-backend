import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organizer from "../models/organizerModel.js";

// Generic auth middleware - export as a standalone function
export const authMiddleware = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Helper function to extract token from header
const getTokenFromHeader = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

// Organizer-specific middleware
export const verifyOrganizerToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const organizer = await Organizer.findById(decoded.id);

    if (!organizer) {
      return res.status(401).json({ message: "Not authorized as organizer" });
    }

    req.organizer = organizer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Export default as object with all middleware
export default {
  authMiddleware,
  verifyOrganizerToken,
};
