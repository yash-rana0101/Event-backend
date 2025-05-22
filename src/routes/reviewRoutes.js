import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createReview,
  getUserReviews,
  getEventReviews,
  deleteReview,
} from "../controllers/reviewController.js";

const router = Router();

// Public routes
router.get("/events/:eventId", asyncHandler(getEventReviews)); // Get all reviews for an event

// Protected routes
router.use(authMiddleware);
router.post("/", asyncHandler(createReview)); // Create/update a review
router.get("/user", asyncHandler(getUserReviews)); // Get user's reviews
router.delete("/:reviewId", asyncHandler(deleteReview)); // Delete a review

export default router;
