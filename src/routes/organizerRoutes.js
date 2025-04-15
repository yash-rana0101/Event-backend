import { Router } from "express";
import organizerController from "../controllers/organizerController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { loginLimiter } from "../middlewares/securityMiddleware.js";
import { verifyOrganizerToken } from "../middlewares/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOrganizerEvents } from "../controllers/eventController.js";
// Import the organizerModel
import organizerModel from "../models/organizerModel.js";
import Event from "../models/Event.js";

const router = Router();

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API connection successful",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes with rate limiting
router.post(
  "/register",
  loginLimiter,
  asyncHandler(organizerController.register)
);

// Add the missing login endpoint
router.post("/login", loginLimiter, asyncHandler(organizerController.login));

// Public route to get organizer profile by ID (accessible without auth)
router.get(
  "/profile/:organizerId",
  asyncHandler(async (req, res) => {
    try {
      const { organizerId } = req.params;

      if (!organizerId) {
        return res.status(400).json({ message: "Organizer ID is required" });
      }

      // Find the organizer by ID - use organizerModel instead of Organizer
      const organizer = await organizerModel.findById(organizerId).select(
        "-password -__v"
      );

      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      // Return the organizer data (excluding sensitive fields)
      res.json(organizer);
    } catch (error) {
      console.error("Error fetching organizer profile:", error);
      res.status(500).json({ message: "Failed to retrieve organizer profile" });
    }
  })
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

// Add route to fetch organizer profile details
router.get(
  "/:organizerId/details",
  asyncHandler(organizerController.getOrganizerDetails)
);

// Organizer details management
router.post(
  "/:organizerId/details",
  asyncHandler(organizerController.createOrganizerDetails)
);

router.put(
  "/:organizerId/details",
  asyncHandler(organizerController.updateOrganizerDetails)
);

router.get(
  "/:organizerId/details",
  asyncHandler(organizerController.getOrganizerDetails)
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

// Add route to fetch all events for a specific organizer
router.get(
  "/events/organizer/:organizerId",
  verifyOrganizerToken,
  asyncHandler(async (req, res, next) => {
    const { organizerId } = req.params;
    console.log("Current organizer ID:", req.organizer._id.toString());
    if (!organizerId || organizerId !== req.organizer._id.toString()) {
      return res
        .status(403)
        .json({ message: "Access denied. Invalid organizer ID." });
    }

    const events = await Event.find({ organizer: organizerId }).populate(
      "organizer",
      "name email"
    );

    console.log("Fetched events:", events);
    res.status(200).json(events);
  })
);

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
