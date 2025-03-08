import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import eventOrganizerMiddleware from "../middlewares/eventOrganizerMiddleware.js";
import {
  listPublicEvents,
  getEventDetails,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventAttendees,
  createTicketType,
} from "../controllers/eventController.js";

const router = Router();

// Public routes for viewing events
router.get("/", listPublicEvents);

router.get("/:id", getEventDetails);

// Protected routes - require authentication
router.use(authMiddleware);

// Event creation and management
router.post("/", validate("event"), createEvent);

// Routes requiring event organizer permission
router.use("/:eventId", eventOrganizerMiddleware);

router.put("/:eventId", validate("event"), updateEvent);

router.delete("/:eventId", deleteEvent);

router.get("/:eventId/attendees", getEventAttendees);

router.post("/:eventId/tickets", validate("ticket"), createTicketType);

export default router;
