import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Import as a function

const router = Router();

// Public routes - if any
router.get(
  "/public-announcements",
  asyncHandler(async (req, res) => {
    // Get public notifications/announcements
    res.json({ announcements: [] });
  })
);

// Protected routes - make sure to use the function directly
router.use(authMiddleware); // This should be the function itself, not an object

// User notifications
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Get user's notifications
    res.json({ notifications: [] });
  })
);

router.put(
  "/:notificationId/read",
  asyncHandler(async (req, res) => {
    // Mark notification as read
    res.json({ message: "Notification marked as read" });
  })
);

router.put(
  "/read-all",
  asyncHandler(async (req, res) => {
    // Mark all notifications as read
    res.json({ message: "All notifications marked as read" });
  })
);

// For admins/organizers
router.post(
  "/send",
  asyncHandler(async (req, res) => {
    // Send notification to user(s)
    res.status(201).json({ message: "Notification sent" });
  })
);

export default router;
