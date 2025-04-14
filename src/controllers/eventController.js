import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import organizerModel from "../models/organizerModel.js";
import mongoose from "mongoose";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
} from "../utils/fileStorage.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// Function to validate event data before saving
export const validateEventData = (eventData) => {
  const requiredFields = ["title", "description", "startDate"];
  const missingFields = requiredFields.filter((field) => !eventData[field]);

  if (missingFields.length > 0) {
    return {
      valid: false,
      missingFields,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  // Ensure status is set with a default value if not provided
  if (!eventData.status) {
    eventData.status = "active";
  }

  return {
    valid: true,
    data: eventData,
  };
};

// Get all events (with filtering and pagination)
export const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "-createdAt",
      category,
      featured,
      isPaid,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Apply filters
    if (category) query.category = category;
    if (featured === "true") query.featured = true;
    if (isPaid === "true") query.isPaid = true;
    if (isPaid === "false") query.isPaid = false;

    // Search query
    if (search) {
      query.$text = { $search: search };
    }

    // Date range filter
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // For regular users, only show published events
    if (!req.user || req.user.role !== "admin") {
      query.isPublished = true;
    }

    // Execute query with pagination
    const events = await Event.find(query)
      .populate("organizer", "name profilePicture")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalEvents = await Event.countDocuments(query);

    res.status(200).json({
      events,
      totalPages: Math.ceil(totalEvents / limit),
      currentPage: parseInt(page),
      totalEvents,
    });
  } catch (error) {
    console.error("Error getting events:", error);
    res
      .status(500)
      .json({ message: "Failed to get events", error: error.message });
  }
};

// Get published events (public route)
export const getPublishedEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "-startDate",
      category,
      featured,
      search,
    } = req.query;

    const query = { isPublished: true };

    // Apply filters
    if (category) query.category = category;
    if (featured === "true") query.featured = true;

    // Search query
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const events = await Event.find(query)
      .populate("organizer", "name profilePicture")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalEvents = await Event.countDocuments(query);

    res.status(200).json({
      events,
      totalPages: Math.ceil(totalEvents / limit),
      currentPage: parseInt(page),
      totalEvents,
    });
  } catch (error) {
    console.error("Error getting published events:", error);
    res
      .status(500)
      .json({ message: "Failed to get events", error: error.message });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate(
      "organizer",
      "name email profilePicture"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // If event is not published and requester is not admin or organizer, deny access
    if (!event.isPublished) {
      // If no user is logged in or user is not admin or the organizer
      if (
        !req.user ||
        (req.user.role !== "admin" &&
          req.user._id.toString() !== event.organizer._id.toString())
      ) {
        return res
          .status(403)
          .json({ message: "This event is not published yet" });
      }
    }

    // Get number of registrations
    const registrationsCount = await Registration.countDocuments({
      event: eventId,
      status: "confirmed",
    });

    // Add attendees count to response
    const eventResponse = {
      ...event.toObject(),
      attendeesCount: registrationsCount,
    };

    res.status(200).json(eventResponse);
  } catch (error) {
    console.error("Error getting event:", error);
    res
      .status(500)
      .json({ message: "Failed to get event", error: error.message });
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    // Validate event data
    const validation = validateEventData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        missingFields: validation.missingFields,
      });
    }

    // Get the validated data from req.validatedData or fall back to req.body
    const eventData = req.validatedData || req.body;

    console.log("Creating event with data:", eventData);

    // Ensure we have organizer ID from the authenticated user
    const organizerId = req.organizer?._id || req.user?._id;
    if (!organizerId && !eventData.organizer) {
      return res.status(400).json({
        success: false,
        message: "Organizer ID is required",
      });
    }

    const imagesLocalPath = req.file?.path;

    let imagesUrl;

    if (imagesLocalPath) {
      const images = await uploadOnCloudinary(imagesLocalPath);
      if (images) {
        imagesUrl = images.url;
        console.log("images : ", images);
      }
    }
    console.log("imagesUrl : ", imagesUrl);
    console.log("request files : ", req.file);
    // Create the event object
    const newEvent = new Event({
      ...eventData,
      images: imagesUrl,
      organizer: eventData.organizer || organizerId,
      date:
        eventData.date || new Date(eventData.startDate).toLocaleDateString(),
      status: eventData.status || "active",
    });

    console.log("Creating new event:", {
      title: newEvent.title,
      status: newEvent.status,
      organizer: newEvent.organizer,
    });

    // Save the event
    const savedEvent = await newEvent.save();

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: savedEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);

    // Handle specific errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: Object.keys(error.errors).map((field) => ({
          field,
          message: error.errors[field].message,
        })),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: error.message,
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find event
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the user has permission to update this event
    if (
      req.organizer &&
      req.organizer._id.toString() !== event.organizer.toString() &&
      req.organizer.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this event" });
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res
      .status(500)
      .json({ message: "Failed to update event", error: error.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find event
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the user has permission to delete this event
    if (
      req.organizer &&
      req.organizer._id.toString() !== event.organizer.toString() &&
      req.organizer.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this event" });
    }

    // Delete any associated images (if storage util exists)
    if (event.images && event.images.length > 0) {
      try {
        for (const imageUrl of event.images) {
          await deleteFileFromStorage(imageUrl);
        }
      } catch (storageError) {
        console.error("Error removing image files:", storageError);
      }
    }

    // Delete the event
    await Event.findByIdAndDelete(id);

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res
      .status(500)
      .json({ message: "Failed to delete event", error: error.message });
  }
};

// Upload event images
export const uploadEventImages = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the user has permission
    if (
      req.organizer &&
      req.organizer._id.toString() !== event.organizer.toString() &&
      req.organizer.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this event" });
    }

    // Upload images and get URLs
    const imageUrls = [];

    for (const file of req.files) {
      const imageUrl = await uploadFileToStorage(file, `events/${id}`);
      imageUrls.push(imageUrl);
    }

    // Update event with new images
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $push: { images: { $each: imageUrls } } },
      { new: true }
    );

    res.status(200).json({
      message: "Images uploaded successfully",
      images: imageUrls,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error uploading event images:", error);
    res
      .status(500)
      .json({ message: "Failed to upload images", error: error.message });
  }
};

// Get organizer events
export const getOrganizerEvents = async (req, res) => {
  try {
    const organizerId = req.params.organizerId || req.organizer?._id;

    if (!organizerId) {
      return res.status(400).json({ message: "Organizer ID is required" });
    }

    // Get events for this organizer
    const events = await Event.find({ organizer: organizerId }).sort(
      "-createdAt"
    );

    res.status(200).json(events);
  } catch (error) {
    console.error("Error getting organizer events:", error);
    res.status(500).json({
      message: "Failed to get organizer events",
      error: error.message,
    });
  }
};

// Toggle event feature status (admin only)
export const toggleFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find event
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Toggle featured status
    event.featured = !event.featured;
    await event.save();

    res.status(200).json({
      message: `Event ${
        event.featured ? "featured" : "unfeatured"
      } successfully`,
      featured: event.featured,
    });
  } catch (error) {
    console.error("Error toggling featured status:", error);
    res.status(500).json({
      message: "Failed to update featured status",
      error: error.message,
    });
  }
};

// Add social interactions
export const updateSocialInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    // Find event
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Initialize social share object if it doesn't exist
    if (!event.socialShare) {
      event.socialShare = { likes: 0, comments: 0, shares: 0 };
    }

    // Update the appropriate counter
    switch (action) {
      case "like":
        event.socialShare.likes += 1;
        break;
      case "comment":
        event.socialShare.comments += 1;
        break;
      case "share":
        event.socialShare.shares += 1;
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    await event.save();

    res.status(200).json({
      message: `Event ${action} updated successfully`,
      socialShare: event.socialShare,
    });
  } catch (error) {
    console.error("Error updating social interactions:", error);
    res.status(500).json({
      message: "Failed to update social interactions",
      error: error.message,
    });
  }
};

/**
 * Search events based on various criteria
 * @route GET /api/v1/events/search
 * @access Public
 */
export const searchEvents = async (req, res) => {
  try {
    const {
      query,
      category,
      startDate,
      endDate,
      location,
      price,
      page = 1,
      limit = 10,
    } = req.query;

    // Build the search filter
    const filter = {
      status: "active", // Only return published/active events
    };

    // Free text search across multiple fields if query parameter is provided
    if (query) {
      filter.$text = { $search: query };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Filter by location (partial match)
    if (location) {
      filter.$or = [
        { "location.city": { $regex: location, $options: "i" } },
        { "location.country": { $regex: location, $options: "i" } },
        { "location.state": { $regex: location, $options: "i" } },
      ];
    }

    // Filter by price range
    if (price === "free") {
      filter.isPaid = false;
    } else if (price === "paid") {
      filter.isPaid = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const events = await Event.find(filter)
      .sort({ startDate: 1 }) // Sort by upcoming events
      .skip(skip)
      .limit(limitNum)
      .populate("organizer", "name email organization");

    // Get total count for pagination info
    const totalEvents = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total: totalEvents,
      totalPages: Math.ceil(totalEvents / limitNum),
      currentPage: parseInt(page),
      events,
    });
  } catch (error) {
    console.error("Error searching events:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching events",
      error: error.message,
    });
  }
};
