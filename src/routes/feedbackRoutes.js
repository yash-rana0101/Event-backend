import { Router } from "express";
import { validate } from "../middlewares/validationMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Import authMiddleware directly
import Feedback from "../models/Feedback.js"; // Import Feedback model

const router = Router();

// Public feedback routes
router.get(
  "/events/:eventId/feedback",
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const feedback = await Feedback.find({ eventId, public: true });
    res.json({ feedback });
  })
);

// Protected routes - use authMiddleware as a function (not object.method)
router.use(authMiddleware); // Make sure this is a function, not an object

// User feedback management
router.post(
  "/events/:eventId",
  validate("feedback"),
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { userId, content, rating } = req.body;
    const feedback = new Feedback({ eventId, userId, content, rating });
    await feedback.save();
    res.status(201).json({ message: "Feedback submitted" });
  })
);

router.get(
  "/my-feedback",
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const feedback = await Feedback.find({ userId });
    res.json({ feedback });
  })
);

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

router.delete(
  "/:feedbackId",
  asyncHandler(async (req, res) => {
    const { feedbackId } = req.params;
    await Feedback.findByIdAndDelete(feedbackId);
    res.json({ message: "Feedback deleted" });
  })
);

export default router;
