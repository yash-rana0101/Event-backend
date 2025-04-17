import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as userProfileController from "../controllers/userProfileController.js";
import * as userDashboardController from "../controllers/userDashboardController.js";

const router = Router();

// Public routes (no authentication required)
router.get("/user/:userId", asyncHandler(userProfileController.getUserProfile));

// Protected routes (authentication required)
router.use(authMiddleware);

// User profile routes
router.get("/me", asyncHandler(userProfileController.getUserProfile));
router.post("/me", asyncHandler(userProfileController.createUserProfile)); 
router.put("/me", asyncHandler(userProfileController.updateUserProfile));
router.get("/me/events", asyncHandler(userProfileController.getUserEvents));
router.post(
  "/events/:eventId/review",
  asyncHandler(userProfileController.addEventReview)
);
router.put(
  "/me/notification-preferences",
  asyncHandler(userProfileController.updateNotificationPreferences)
);
router.post(
  "/events/:eventId/save",
  asyncHandler(userProfileController.saveEvent)
);
router.delete(
  "/events/:eventId/save",
  asyncHandler(userProfileController.unsaveEvent)
);
router.get(
  "/me/dashboard",
  asyncHandler(userDashboardController.getDashboardOverview)
);

// Dashboard specific routes
router.get(
  "/me/dashboard/calendar",
  asyncHandler(userDashboardController.getCalendarData)
);
router.get(
  "/me/dashboard/events",
  asyncHandler(userDashboardController.getUserEvents)
);
router.get(
  "/me/dashboard/saved",
  asyncHandler(userDashboardController.getSavedEvents)
);
router.get(
  "/me/dashboard/recommendations",
  asyncHandler(userDashboardController.getRecommendations)
);

// Admin only routes
router.put(
  "/user/:userId/badges",
  asyncHandler(userProfileController.updateUserBadges)
);

export default router;
