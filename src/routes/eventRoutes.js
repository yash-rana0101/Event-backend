import { Router } from "express";
import { validate } from "../middlewares/validationMiddleware.js";
// Fix the import - import verifyOrganizerToken from authMiddleware instead
import {
  verifyOrganizerToken,
  authMiddleware,
} from "../middlewares/authMiddleware.js";
import { fileUpload } from "../middlewares/uploadMiddleware.js";
import { createEvent } from "../controllers/eventController.js";
import Event from "../models/Event.js";

const router = Router();

// Public routes that don't require authentication
router.get("/public", async (req, res) => {
  try {
    // Use the existing controller but only return published/active events
    req.query.status = "active"; // Force status to be active
    req.query.isPublished = true;

    // Get all public events with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get events with filters
    const events = await Event.find({
      status: "active",
      isPublished: true,
    })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit)
      .populate("organizer", "name email profilePicture");

    res.status(200).json(events);
  } catch (error) {
    console.error("Error in public events route:", error);
    res.status(500).json({
      message: "Error fetching public events",
      error: error.message,
    });
  }
});

// New route to get newest events
router.get("/newest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    // Get newest events by creation date - fixed the query to handle different field names
    const newestEvents = await Event.find({
      $or: [{ status: "active" }, { isPublished: true }],
    })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(limit)
      .populate("organizer", "name email profilePicture")
      .lean(); // Use lean() for better performance with large objects

    if (!newestEvents || newestEvents.length === 0) {
      console.log("No newest events found");
      return res.status(200).json([]); // Return empty array instead of error
    }

    // For debugging
    console.log(`Found ${newestEvents.length} newest events`);

    res.status(200).json(newestEvents);
  } catch (error) {
    console.error("Error in newest events route:", error);
    res.status(500).json({
      message: "Error fetching newest events",
      error: error.message,
    });
  }
});

// Public route for featured events
router.get("/featured", async (req, res) => {
  try {
    const featuredEvents = await Event.find({
      featured: true,
      status: "active",
      isPublished: true,
    })
      .sort({ startDate: 1 })
      .limit(5)
      .populate("organizer", "name email profilePicture");

    res.status(200).json(featuredEvents);
  } catch (error) {
    console.error("Error in featured events route:", error);
    res.status(500).json({
      message: "Error fetching featured events",
      error: error.message,
    });
  }
});

// Debugging endpoint to check raw events in database
router.get("/debug", async (req, res) => {
  try {
    // Find all events without any filtering
    const allEvents = await Event.find({}).limit(10);

    // Count all events
    const count = await Event.countDocuments({});

    // Return detailed information
    res.status(200).json({
      success: true,
      message: "Debug endpoint - showing raw events from database",
      count: count,
      sampleEvents: allEvents.map((event) => ({
        id: event._id,
        title: event.title,
        status: event.status,
        createdAt: event.createdAt,
      })),
      firstEvent: allEvents.length > 0 ? allEvents[0].toObject() : null,
      collectionName: Event.collection.name,
      indexInfo: await Event.collection.getIndexes(),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Error in debug endpoint",
      error: error.message,
    });
  }
});

// Route to get all events - make it work with or without authentication
router.get("/", async (req, res) => {
  try {
    // Get query parameters for filtering and pagination
    const {
      page = 1,
      limit = 10,
      category,
      status = "active",
      search,
      sortBy = "startDate",
    } = req.query;

    // Build the filter object - IMPORTANT FIX: Only apply filters if they're defined
    let filter = {};

    // Only add status filter if explicitly requested (don't filter by default)
    if (status !== "all") {
      filter.status = status;
    }

    if (category) filter.category = category;

    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    console.log("Using filter:", JSON.stringify(filter));

    // Calculate pagination parameters
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort order
    let sort = {};
    if (sortBy.startsWith("-")) {
      sort[sortBy.substring(1)] = -1;
    } else {
      sort[sortBy] = 1;
    }

    // Get events with filters and pagination
    const events = await Event.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("organizer", "name email profilePicture");

    console.log(`Found ${events.length} events`);

    // Count total events for pagination
    const totalCount = await Event.countDocuments(filter);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    console.log(`Total count: ${totalCount}, Total pages: ${totalPages}`);

    res.status(200).json({
      events,
      currentPage: parseInt(page),
      totalPages,
      totalCount,
    });
  } catch (error) {
    console.error("Error in get events route:", error);
    res.status(500).json({
      message: "Error fetching events",
      error: error.message,
    });
  }
});

// Public route to get a specific event
router.get("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: "Event ID is required." });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: "Failed to fetch event details." });
  }
});

// Protected routes (require authentication)
router.use(authMiddleware);

router.post(
  "/",
  verifyOrganizerToken,
  fileUpload.fields([{ name: "images", maxCount: 1 }]),
  createEvent
);

router.put("/:id", validate("event"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Make sure the user is the organizer of this event or an admin
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check ownership
    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this event",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Make sure the user is the organizer of this event or an admin
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check ownership
    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this event",
      });
    }

    await Event.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
