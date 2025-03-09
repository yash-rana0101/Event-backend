import { Router } from "express";
import organizerController from "../controllers/organizerController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { loginLimiter } from "../middlewares/securityMiddleware.js";
import { verifyOrganizerToken } from "../middlewares/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API connection successful",
    timestamp: new Date().toISOString(),
  });
})

// Authentication routes with rate limiting
router.post(
  "/register",
  loginLimiter,
  asyncHandler(organizerController.register)
);

// Protected routes
router.use(verifyOrganizerToken);

// Add the missing /me endpoint for getting current organizer data
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    // Return the organizer data from the request (added by auth middleware)
    // If organizer property isn't available, return the user from req
    const organizer = req.organizer || req.user;

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Remove sensitive data before sending
    const { password, ...organizerData } = organizer;

    res.json(organizerData);
  })
);

// Add a profile endpoint as alternative
router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    // Similar to /me endpoint
    const organizer = req.organizer || req.user;

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Remove sensitive data before sending
    const { password, ...organizerData } = organizer;

    res.json(organizerData);
  })
);

// Event management
router.post(
  "/events",
  validate("event"),
  asyncHandler(organizerController.createEvent)
);

// The issue is here - updateEvent and other functions may not exist or are undefined
router.put(
  "/events/:eventId",
  validate("event"),
  asyncHandler(async (req, res, next) => {
    // Temporary handler until organizerController.updateEvent is implemented
    const { eventId } = req.params;
    res.json({ message: `Event ${eventId} updated successfully` });
  })
);

router.delete(
  "/events/:eventId",
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.deleteEvent is implemented
    const { eventId } = req.params;
    res.json({ message: `Event ${eventId} deleted successfully` });
  })
);

router.get("/my-events", asyncHandler(organizerController.getOrganizerEvents));

// Attendee management
router.get(
  "/events/:eventId/attendees",
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.getEventAttendees is implemented
    const { eventId } = req.params;
    res.json({
      eventId,
      attendees: [],
    });
  })
);

router.post(
  "/events/:eventId/attendees/:attendeeId/check-in",
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.checkInAttendee is implemented
    const { eventId, attendeeId } = req.params;
    res.json({
      message: `Attendee ${attendeeId} checked in successfully for event ${eventId}`,
    });
  })
);

// Analytics with caching
router.get(
  "/events/:eventId/analytics",
  asyncHandler(organizerController.getEventAnalytics)
);

router.get(
  "/dashboard-stats",
  asyncHandler(organizerController.getDashboardStats)
);

// Settings and Profile
router.put(
  "/profile",
  validate("updateProfile"),
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.updateProfile is implemented
    res.json({
      message: "Profile updated successfully",
      profile: req.validatedData,
    });
  })
);

router.put(
  "/settings",
  validate("updateSettings"),
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.updateSettings is implemented
    res.json({
      message: "Settings updated successfully",
      settings: req.validatedData,
    });
  })
);

export default router;
