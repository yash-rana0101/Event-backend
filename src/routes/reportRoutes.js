import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Import the named function directly

const router = Router();

// If there are any public report routes
router.get(
  "/public-statistics",
  asyncHandler(async (req, res) => {
    // Public statistics endpoint
    res.json({ statistics: {} });
  })
);

// Protected routes - ensure authMiddleware is correctly imported
// Make sure it's imported as a function, not as an object or property
router.use(authMiddleware); // This should be a middleware function

// User report routes
router.get(
  "/my-activity",
  asyncHandler(async (req, res) => {
    // User activity report
    res.json({ activity: [] });
  })
);

// Admin/Organizer report routes
router.get(
  "/events/:eventId/summary",
  asyncHandler(async (req, res) => {
    // Event summary report
    res.json({ summary: {} });
  })
);

router.get(
  "/events/:eventId/attendee-demographics",
  asyncHandler(async (req, res) => {
    // Attendee demographics
    res.json({ demographics: {} });
  })
);

router.get(
  "/events/:eventId/revenue",
  asyncHandler(async (req, res) => {
    // Revenue report
    res.json({ revenue: {} });
  })
);

router.get(
  "/events/:eventId/feedback-summary",
  asyncHandler(async (req, res) => {
    // Feedback summary
    res.json({ feedbackSummary: {} });
  })
);

export default router;
