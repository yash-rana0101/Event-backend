import Feedback from "../models/Feedback.js";

// @desc    Submit feedback for an event
// @route   POST /api/feedback/events/:eventId
// @access  Private
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const eventId = req.params.eventId;

    const feedback = new Feedback({
      user: req.user._id,
      event: eventId,
      rating,
      comment,
    });

    const createdFeedback = await feedback.save();

    res.status(201).json(createdFeedback);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// @desc    Get feedback for an event
// @route   GET /api/feedback/events/:eventId
// @access  Public
export const getEventFeedback = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const feedback = await Feedback.find({ event: eventId })
      .populate("user", "name")
      .sort("-createdAt");

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get feedback summary for an event
// @route   GET /api/feedback/events/:eventId/summary
// @access  Private/EventOrganizer
export const getEventFeedbackSummary = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Get all feedback for the event
    const feedback = await Feedback.find({ event: eventId })
      .populate("user", "name")
      .sort("-createdAt");

    if (feedback.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalFeedback: 0,
          averageRating: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recentComments: [],
          responseRate: 0,
        },
      });
    }

    // Calculate average rating
    const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = (totalRating / feedback.length).toFixed(1);

    // Calculate rating distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedback.forEach((item) => {
      ratingDistribution[item.rating]++;
    });

    // Get recent comments (last 5 with comments)
    const recentComments = feedback
      .filter((item) => item.comment && item.comment.trim() !== "")
      .slice(0, 5)
      .map((item) => ({
        comment: item.comment,
        rating: item.rating,
        userName: item.user?.name || "Anonymous",
        createdAt: item.createdAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        totalFeedback: feedback.length,
        averageRating: parseFloat(averageRating),
        ratingDistribution,
        recentComments,
        responseRate: 0, // This would need attendee count to calculate properly
      },
    });
  } catch (error) {
    console.error("Error getting feedback summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get feedback summary",
      error: error.message,
    });
  }
};

// @desc    Get feedback submitted by a user
// @route   GET /api/feedback/user
// @access  Private
export const getUserFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user._id })
      .populate("event", "title")
      .sort("-createdAt");

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private/Admin
export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({})
      .populate("user", "name")
      .populate("event", "title")
      .sort("-createdAt");

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    await feedback.remove();

    res.status(200).json({ message: "Feedback deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
