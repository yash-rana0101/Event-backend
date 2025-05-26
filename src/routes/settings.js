import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { catchAsync } from "../utils/errorHandler.js";
import { apiLimiter } from "../middlewares/securityMiddleware.js";
import {
  getSettings,
  updateSettings,
  createBackup,
  uploadAvatar,
  downloadBackup,
  restoreBackup,
} from "../controllers/settingsController.js";

const router = express.Router();

// Admin middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Check specifically for admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message:
        "Admin privileges required. Only administrators can access these settings.",
    });
  }

  next();
};

// Apply rate limiting to all settings routes
router.use(apiLimiter);

// Get all settings
router.get("/", authMiddleware, adminMiddleware, catchAsync(getSettings));

// Update specific settings section (removed validation temporarily to fix issues)
router.put("/", authMiddleware, adminMiddleware, catchAsync(updateSettings));


// Create backup
router.post(
  "/create-backup",
  authMiddleware,
  adminMiddleware,
  catchAsync(createBackup)
);

// Upload avatar using the upload middleware
router.post(
  "/upload-avatar",
  authMiddleware,
  adminMiddleware,
  upload.single("avatar"),
  catchAsync(uploadAvatar)
);

// Download backup
router.get(
  "/download-backup/:backupId",
  authMiddleware,
  adminMiddleware,
  catchAsync(downloadBackup)
);

// Restore backup
router.post(
  "/restore-backup",
  authMiddleware,
  adminMiddleware,
  upload.single("backup"),
  catchAsync(restoreBackup)
);

export default router;
