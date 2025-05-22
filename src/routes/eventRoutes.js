import { Router } from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import * as eventController from "../controllers/eventController.js";
import eventOrganizerMiddleware from "../middlewares/eventOrganizerMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// Public routes
router.get("/", asyncHandler(eventController.getAllEvents)); // Get all events - already not filtering by status
router.get("/published", asyncHandler(eventController.getPublishedEvents)); // Get published events
router.get("/search", asyncHandler(eventController.searchEvents)); // Search events
router.get(
  "/:eventId",
  optionalAuth,
  asyncHandler(eventController.getEventById)
); // Get event by ID

// Protected routes
router.use(authMiddleware);

// Event creation and management
router.post(
  "/",
  upload.array("images", 5), // Using the imported upload middleware
  asyncHandler(eventController.createEvent)
); // Create event
router.put(
  "/:id",
  eventOrganizerMiddleware,
  upload.array("images", 5),
  asyncHandler(eventController.updateEvent)
); // Update event
router.delete(
  "/:id",
  eventOrganizerMiddleware,
  asyncHandler(eventController.deleteEvent)
); // Delete event
router.post(
  "/:id/images",
  eventOrganizerMiddleware,
  upload.array("images", 5),
  asyncHandler(eventController.uploadEventImages)
); // Upload event images
router.get(
  "/organizer/:organizerId",
  asyncHandler(eventController.getOrganizerEvents)
); // Get organizer events
router.patch(
  "/:id/featured",
  eventOrganizerMiddleware,
  asyncHandler(eventController.toggleFeaturedStatus)
); // Toggle featured status (admin only)
router.post(
  "/:id/social",
  asyncHandler(eventController.updateSocialInteractions)
); // Update social interactions

export default router;
