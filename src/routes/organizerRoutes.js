import { Router } from "express";
import { validate } from "../middlewares/validationMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { registerOrganizer,loginOrganizer,getOrganizerProfile,updateOrganizerProfile } from "../controllers/organizerController.js";
import {getOrganizerEvents,createEvent,updateEvent,deleteEvent,getCompletedEvents,} from "../controllers/eventController.js";
import {getOrganizerMetrics,getRevenueMetrics} from "../controllers/organizerMetricsController.js";
import asyncHandler from "../utils/asyncHandler.js";
import eventOrganizerMiddleware from "../middlewares/eventOrganizerMiddleware.js";
import attendeeController from "../controllers/attendeeController.js"; // Import the attendee controller
// Import other middleware as needed

const router = Router();

// Public routes
router.post("/register",validate("registerOrganizer"),asyncHandler(registerOrganizer));
router.post("/login", asyncHandler(loginOrganizer));

// public route to get organizer profile
router.get("/public/profile/:id", asyncHandler(getOrganizerProfile));

// Protected routes - require authentication
router.use(authMiddleware);

// Profile routes
router.get("/profile/:id", asyncHandler(getOrganizerProfile));
router.put("/profile/:id", asyncHandler(updateOrganizerProfile));

// Event management routes
router.get("/events", asyncHandler(getOrganizerEvents));
router.get("/events/completed", asyncHandler(getCompletedEvents));
router.post("/events", validate("createEvent"), asyncHandler(createEvent));
router.put("/events/:id", validate("updateEvent"), eventOrganizerMiddleware, asyncHandler(updateEvent));
router.delete("/events/:id",eventOrganizerMiddleware,asyncHandler(deleteEvent));

// Metrics routes
router.get("/metrics", asyncHandler(getOrganizerMetrics));
router.get("/metrics/revenue", asyncHandler(getRevenueMetrics));

// Event attendees management routes
router.get("/events/:eventId/attendees", attendeeController.getEventAttendees);

router.post("/events/:eventId/attendees/:attendeeId/check-in", attendeeController.updateAttendeeCheckIn);

router.post(
  "/events/:eventId/attendees",
  attendeeController.addAttendeeManually
);

// Add other organizer routes as needed

export default router;
