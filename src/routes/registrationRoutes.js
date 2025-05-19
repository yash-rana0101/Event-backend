import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import registrationController from "../controllers/registrationController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All registration routes need authentication
router.use(authMiddleware);

// Register for an event
router.post(
  "/events/:eventId",
  asyncHandler(registrationController.registerForEvent)
);

// Cancel registration
router.delete(
  "/events/:eventId",
  asyncHandler(registrationController.cancelRegistration)
);

// Reactivate a cancelled registration
router.patch(
  "/events/:eventId/reactivate",
  asyncHandler(registrationController.reactivateRegistration)
);

// Check if user is registered for an event
router.get(
  "/check/:eventId",
  asyncHandler(registrationController.checkRegistration)
);

// Get user's registrations
router.get("/", asyncHandler(registrationController.getUserRegistrations));

export default router;
