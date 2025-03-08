import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// Public registration routes
router.post(
  "/events/:eventId/register",
  validate("registration"),
  asyncHandler(async (req, res) => {
    // Registration logic
    res.status(201).json({ message: "Registration successful" });
  })
);

// Protected routes - use authMiddleware directly as a function, not as an object
router.use(authMiddleware);

// User registration management
router.get(
  "/my-registrations",
  asyncHandler(async (req, res) => {
    // Get user's registrations
    res.json({ registrations: [] });
  })
);

router.get(
  "/:registrationId",
  asyncHandler(async (req, res) => {
    // Get specific registration details
    res.json({ registration: {} });
  })
);

router.put(
  "/:registrationId/cancel",
  asyncHandler(async (req, res) => {
    // Cancel registration logic
    res.json({ message: "Registration cancelled" });
  })
);

// Event organizer routes
router.get(
  "/events/:eventId/registrations",
  asyncHandler(async (req, res) => {
    // Get all registrations for an event
    res.json({ registrations: [] });
  })
);

router.put(
  "/:registrationId/check-in",
  asyncHandler(async (req, res) => {
    // Check-in logic
    res.json({ message: "Check-in successful" });
  })
);

export default router;
