import { Router } from "express";
import { validate } from "../middlewares/validationMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import Feedback from "../models/Feedback.js";
import {
  submitFeedback,
  getEventFeedback,
  getEventFeedbackSummary,
  getUserFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";

const router = Router();

// Public feedback routes
router.get("/events/:eventId/feedback", asyncHandler(getEventFeedback));

// Add feedback summary route
router.get("/events/:eventId/summary", asyncHandler(getEventFeedbackSummary));

// Protected routes
router.use(authMiddleware);

// User feedback management
router.post(
  "/events/:eventId",
  validate("feedback"),
  asyncHandler(submitFeedback)
);

router.get("/my-feedback", asyncHandler(getUserFeedback));

router.put(
  "/:feedbackId",
  validate("feedback"),
  asyncHandler(async (req, res) => {
    const { feedbackId } = req.params;
    const { content, rating } = req.body;
    await Feedback.findByIdAndUpdate(feedbackId, { content, rating });
    res.json({ message: "Feedback updated" });
  })
);

router.delete("/:feedbackId", asyncHandler(deleteFeedback));

export default router;
