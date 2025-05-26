import jwt from "jsonwebtoken";
import User from "../models/User.js";

const adminMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    req.user = user;
    req.admin = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export default adminMiddleware;
