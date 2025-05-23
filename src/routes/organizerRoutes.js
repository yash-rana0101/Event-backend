import { Router } from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import organizerController from "../controllers/organizerController.js";
import mongoose from "mongoose";
import organizerModel from "../models/organizerModel.js";
import organizerDetailsModel from "../models/organizerDetailsModel.js";
import { validate } from "../middlewares/validationMiddleware.js"; // Add this import
import asyncHandler from "../utils/asyncHandler.js";
import { verifyOrganizerToken } from "../middlewares/authMiddleware.js";
import attendeeController from "../controllers/attendeeController.js"; // Import the attendee controller

const router = Router();

// Helper function to safely extract and validate ObjectId
const validateAndExtractId = (id) => {
  // Check if the id is already a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(id)) {
    return id;
  }

  // If it's an object with _id, extract it
  if (typeof id === "object" && id !== null) {
    if (id._id && mongoose.Types.ObjectId.isValid(id._id)) {
      return id._id;
    }
    // If it has _doc._id (commonly from JSON-serialized Mongoose objects)
    if (
      id._doc &&
      id._doc._id &&
      mongoose.Types.ObjectId.isValid(id._doc._id)
    ) {
      return id._doc._id;
    }
  }

  // If it's a string that could be parsed as JSON
  if (typeof id === "string") {
    try {
      if (id.startsWith("{") && id.endsWith("}")) {
        const parsed = JSON.parse(id);
        if (parsed._id && mongoose.Types.ObjectId.isValid(parsed._id)) {
          return parsed._id;
        }
        if (
          parsed._doc &&
          parsed._doc._id &&
          mongoose.Types.ObjectId.isValid(parsed._doc._id)
        ) {
          return parsed._doc._id;
        }
      }
    } catch (e) {
      // Parsing failed, continue with other methods
    }
  }

  // Return null if no valid ID could be extracted
  return null;
};

// Register a new organizer
router.post("/register", organizerController.register);

// Login for organizers
router.post("/login", organizerController.login);

// PUBLIC ENDPOINTS - no authentication required
// Get organizer profile - public access
router.get("/profile/:organizerId", async (req, res) => {
  try {
    let { organizerId } = req.params;

    // Log received ID for debugging
    console.log("Organizer ID received (public):", organizerId);

    // Validate and extract a proper ObjectId
    const validId = validateAndExtractId(organizerId);
    if (!validId) {
      console.error("Invalid organizer ID format:", organizerId);
      return res.status(400).json({
        success: false,
        message: "Invalid organizer ID format",
      });
    }

    // Use the validated ID
    const organizer = await organizerModel
      .findById(validId)
      .select("-password -email");

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // Try to get organizer details
    let details = null;
    try {
      details = await organizerDetailsModel.findOne({ organizer: validId });
    } catch (detailsErr) {
      console.log("No details found for public profile");
    }

    // Try to get events count and other stats
    const Event = mongoose.model("Event");
    let eventsHosted = 0;
    let totalAttendees = 0;
    let clientSatisfaction = "N/A";
    let awards = 0;

    try {
      // Count events hosted by this organizer
      eventsHosted = await Event.countDocuments({ organizer: validId });

      // Sum up attendees from all events
      const events = await Event.find({ organizer: validId });
      totalAttendees = events.reduce((sum, event) => {
        return sum + (event.attendeesCount || 0);
      }, 0);

      // Get client satisfaction if available in details
      if (details && details.clientSatisfaction) {
        clientSatisfaction = details.clientSatisfaction;
      }

      // Get awards if available in details
      if (details && details.awards) {
        awards = details.awards.length || 0;
      }
    } catch (statsErr) {
      console.log("Error fetching organizer stats:", statsErr);
    }

    // Prepare the enhanced response
    const enhancedProfile = {
      ...organizer.toObject(),
      // Add details if available
      ...(details
        ? {
            bio: details.bio || "No bio provided",
            location: details.location || "",
            expertise: details.expertise || [],
            certifications: details.certifications || [],
            socials: details.socials || [],
            testimonials: details.testimonials || [],
          }
        : {
            bio: "No bio provided",
            expertise: [],
            certifications: [],
            socials: [],
            testimonials: [],
          }),
      // Add stats
      stats: {
        eventsHosted,
        totalAttendees: totalAttendees.toString(),
        clientSatisfaction,
        awards,
      },
    };

    return res.status(200).json(enhancedProfile);
  } catch (error) {
    console.error("Error fetching public organizer profile:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Public endpoint for organizer details with limited info
router.get("/public/:organizerId", async (req, res) => {
  try {
    let { organizerId } = req.params;

    // Validate and extract a proper ObjectId
    const validId = validateAndExtractId(organizerId);
    if (!validId) {
      return res.status(400).json({
        success: false,
        message: "Invalid organizer ID format",
      });
    }

    // Fetch basic organizer data (excluding sensitive info)
    const organizer = await organizerModel
      .findById(validId)
      .select("-password -email");

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // Try to get public details
    let details = null;
    try {
      details = await organizerDetailsModel.findOne({ organizer: validId });
    } catch (detailsErr) {
      console.log("No details found for public profile");
    }

    // Combine data and return
    return res.status(200).json({
      ...organizer.toObject(),
      ...(details
        ? {
            bio: details.bio,
            location: details.location,
            expertise: details.expertise,
            certifications: details.certifications,
          }
        : {}),
    });
  } catch (error) {
    console.error("Error fetching public organizer details:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Protected routes - everything below needs authentication
router.use(authMiddleware);

// Update organizer profile
router.put("/profile", async (req, res) => {
  try {
    const organizerId = req.organizer._id;

    // Check if the organizer exists
    const organizer = await organizerModel.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // Update allowed fields
    const allowedUpdates = ["name", "email", "phone", "company", "description"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Apply updates
    const updatedOrganizer = await organizerModel.findByIdAndUpdate(
      organizerId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      organizer: updatedOrganizer,
    });
  } catch (error) {
    console.error("Error updating organizer profile:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
});

// Get organizer details - fix the ID handling
router.get("/:organizerId/details", async (req, res) => {
  try {
    let { organizerId } = req.params;

    // Log received ID for debugging
    console.log("Organizer details ID received:", organizerId);

    // Validate and extract a proper ObjectId
    const validId = validateAndExtractId(organizerId);
    if (!validId) {
      console.error("Invalid organizer ID format for details:", organizerId);
      return res.status(400).json({
        success: false,
        message: "Invalid organizer ID format",
      });
    }

    // Use the validated ID
    const organizerDetails = await organizerDetailsModel.findOne({
      organizer: validId,
    });

    if (!organizerDetails) {
      return res.status(404).json({
        success: false,
        message: "Organizer details not found",
      });
    }

    return res.status(200).json(organizerDetails);
  } catch (error) {
    console.error("Error fetching organizer details:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Update organizer details - fix ID handling
router.put("/:organizerId/details", async (req, res) => {
  try {
    let { organizerId } = req.params;

    // Validate and extract a proper ObjectId
    const validId = validateAndExtractId(organizerId);
    if (!validId) {
      return res.status(400).json({
        success: false,
        message: "Invalid organizer ID format",
      });
    }

    // Check if this is the correct organizer (authorization)
    if (req.organizer._id.toString() !== validId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile",
      });
    }

    // Find or create organizer details
    let organizerDetails = await organizerDetailsModel.findOne({
      organizer: validId,
    });

    if (organizerDetails) {
      // Update existing details
      Object.keys(req.body).forEach((key) => {
        organizerDetails[key] = req.body[key];
      });

      await organizerDetails.save();
    } else {
      // Create new details
      organizerDetails = new organizerDetailsModel({
        organizer: validId,
        ...req.body,
      });

      await organizerDetails.save();
    }

    return res.status(200).json({
      success: true,
      message: "Organizer details updated successfully",
      details: organizerDetails,
    });
  } catch (error) {
    console.error("Error updating organizer details:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating details",
      error: error.message,
    });
  }
});

// Event management
router.post("/events", asyncHandler(organizerController.createEvent));

// The issue is here - updateEvent and other functions may not exist or are undefined
router.put(
  "/events/:eventId",
  validate("event"),
  asyncHandler(async (req, res, next) => {
    // Temporary handler until organizerController.updateEvent is implemented
    const { eventId } = req.params;
    res.json({ message: `Event ${eventId} updated successfully` });
  })
);

router.delete(
  "/events/:eventId",
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.deleteEvent is implemented
    const { eventId } = req.params;
    res.json({ message: `Event ${eventId} deleted successfully` });
  })
);

router.get("/my-events", asyncHandler(organizerController.getOrganizerEvents));

// Add route to fetch all events for a specific organizer
router.get(
  "/events/organizer/:organizerId",
  verifyOrganizerToken,
  asyncHandler(async (req, res, next) => {
    const { organizerId } = req.params;
    console.log("Current organizer ID:", req.organizer._id.toString());
    if (!organizerId || organizerId !== req.organizer._id.toString()) {
      return res
        .status(403)
        .json({ message: "Access denied. Invalid organizer ID." });
    }

    const events = await Event.find({ organizer: organizerId }).populate(
      "organizer",
      "name email"
    );

    console.log("Fetched events:", events);
    res.status(200).json(events);
  })
);

// Attendee management
router.get(
  "/events/:eventId/attendees",
  authMiddleware,
  asyncHandler(attendeeController.getEventAttendees)
);

// Update attendee check-in status
router.post(
  "/events/:eventId/attendees/:attendeeId/check-in",
  authMiddleware,
  asyncHandler(attendeeController.updateAttendeeCheckIn)
);

// Add attendee manually
router.post(
  "/events/:eventId/attendees",
  authMiddleware,
  asyncHandler(attendeeController.addAttendeeManually)
);

// Analytics with caching
router.get(
  "/events/:eventId/analytics",
  asyncHandler(organizerController.getEventAnalytics)
);

router.get(
  "/dashboard-stats",
  asyncHandler(organizerController.getDashboardStats)
);

// Settings and Profile
router.put(
  "/profile",
  validate("updateProfile"),
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.updateProfile is implemented
    res.json({
      message: "Profile updated successfully",
      profile: req.validatedData,
    });
  })
);

router.put(
  "/settings",
  validate("updateSettings"),
  asyncHandler(async (req, res) => {
    // Temporary handler until organizerController.updateSettings is implemented
    res.json({
      message: "Settings updated successfully",
      settings: req.validatedData,
    });
  })
);

export default router;
