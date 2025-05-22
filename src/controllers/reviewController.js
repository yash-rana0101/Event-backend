import Feedback from "../models/Feedback.js";
import Event from "../models/Event.js";
import mongoose from "mongoose";
import ApiResponse from "../utils/apiResponse.js";

// Create or update a review for an event
export const createReview = async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!eventId || !rating) {
      return ApiResponse.badRequest(res, "Event ID and rating are required");
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiResponse.badRequest(res, "Invalid event ID format");
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return ApiResponse.notFound(res, "Event not found");
    }

    // Check if user has already reviewed this event
    let existingReview = await Feedback.findOne({
      user: userId,
      event: eventId,
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment || existingReview.comment;
      await existingReview.save();

      return ApiResponse.success(
        res,
        "Review updated successfully",
        existingReview
      );
    } else {
      // Create new review
      const newReview = new Feedback({
        user: userId,
        event: eventId,
        rating,
        comment: comment || "",
      });

      await newReview.save();

      // Populate event name for response
      const populatedReview = await Feedback.findById(newReview._id)
        .populate("event", "title")
        .lean();

      return ApiResponse.success(
        res,
        "Review submitted successfully",
        populatedReview,
        201
      );
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`Getting reviews for user ${userId}`);

    const reviews = await Feedback.find({ user: userId })
      .populate("event", "title")
      .sort("-createdAt")
      .lean();

    console.log(`Found ${reviews.length} reviews:`, reviews);

    // Format reviews for frontend
    const formattedReviews = reviews.map((review) => ({
      _id: review._id,
      eventId: review.event._id,
      eventName: review.event.title || "Unknown Event",
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Error retrieving user reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reviews",
      error: error.message,
    });
  }
};

// Get reviews for an event
export const getEventReviews = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiResponse.badRequest(res, "Invalid event ID format");
    }

    const reviews = await Feedback.find({ event: eventId })
      .populate("user", "name")
      .sort("-createdAt")
      .lean();

    return ApiResponse.success(res, "Event reviews retrieved successfully", {
      reviews,
    });
  } catch (error) {
    console.error("Error retrieving event reviews:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return ApiResponse.badRequest(res, "Invalid review ID format");
    }

    const review = await Feedback.findById(reviewId);

    if (!review) {
      return ApiResponse.notFound(res, "Review not found");
    }

    // Check if user owns this review or is an admin
    if (
      review.user.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return ApiResponse.forbidden(res, "Not authorized to delete this review");
    }

    await Feedback.findByIdAndDelete(reviewId);

    return ApiResponse.success(res, "Review deleted successfully");
  } catch (error) {
    console.error("Error deleting review:", error);
    return ApiResponse.error(res, error.message);
  }
};
