import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      capacity,
      price,
      category,
      isVirtual,
      isPublished,
    } = req.body;

    const event = new Event({
      title,
      description,
      startDate,
      endDate,
      location,
      capacity,
      price: price || 0,
      category,
      isVirtual: isVirtual || false,
      isPublished: isPublished || false,
      organizer: req.user._id,
      images: [],
    });

    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all events (including unpublished)
// @route   GET /api/events
// @access  Private/Admin
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({}).populate("organizer", "name email");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get published events
// @route   GET /api/events/published
// @access  Public
export const getPublishedEvents = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    const queryObject = { isPublished: true };

    if (category) {
      queryObject.category = category;
    }

    const events = await Event.find(queryObject)
      .populate("organizer", "name")
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const count = await Event.countDocuments(queryObject);

    res.status(200).json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "name email"
    );

    if (event) {
      // Get registered count for this event
      const registeredCount = await Registration.countDocuments({
        event: req.params.id,
        status: "confirmed",
      });

      const eventData = event.toObject();
      eventData.registeredCount = registeredCount;

      res.status(200).json(eventData);
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/EventOrganizer
export const updateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      capacity,
      price,
      category,
      isVirtual,
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update fields
    if (title) event.title = title;
    if (description) event.description = description;
    if (startDate) event.startDate = startDate;
    if (endDate) event.endDate = endDate;
    if (location) event.location = location;
    if (capacity) event.capacity = capacity;
    if (price !== undefined) event.price = price;
    if (category) event.category = category;
    if (isVirtual !== undefined) event.isVirtual = isVirtual;

    const updatedEvent = await event.save();
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/EventOrganizer
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if there are existing registrations
    const registrations = await Registration.countDocuments({
      event: req.params.id,
    });

    if (registrations > 0) {
      return res.status(400).json({
        message:
          "Cannot delete event with existing registrations. Unpublish it instead.",
      });
    }

    await event.remove();
    res.status(200).json({ message: "Event removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Publish an event
// @route   POST /api/events/:id/publish
// @access  Private/EventOrganizer
export const publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.isPublished = true;
    await event.save();

    res.status(200).json({ message: "Event published", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unpublish an event
// @route   POST /api/events/:id/unpublish
// @access  Private/EventOrganizer
export const unpublishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.isPublished = false;
    await event.save();

    res.status(200).json({ message: "Event unpublished", event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload event images
// @route   POST /api/events/:id/upload-image
// @access  Private/EventOrganizer
export const uploadEventImage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get image paths from upload middleware
    const imagePaths = req.files.map((file) => file.path);

    // Add new images
    event.images = [...event.images, ...imagePaths];

    const updatedEvent = await event.save();

    res.status(200).json({
      message: "Images uploaded",
      images: updatedEvent.images,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search events
// @route   GET /api/events/search
// @access  Public
export const searchEvents = async (req, res) => {
  try {
    const {
      keyword,
      startDate,
      endDate,
      category,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query object
    const queryObject = { isPublished: true };

    // Search by keyword in title or description
    if (keyword) {
      queryObject.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      queryObject.startDate = {};

      if (startDate) {
        queryObject.startDate.$gte = new Date(startDate);
      }

      if (endDate) {
        queryObject.endDate = { $lte: new Date(endDate) };
      }
    }

    // Filter by category
    if (category) {
      queryObject.category = category;
    }

    // Execute query with pagination
    const events = await Event.find(queryObject)
      .populate("organizer", "name")
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const count = await Event.countDocuments(queryObject);

    res.status(200).json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listPublicEvents = async (req, res) => {
  try {
    // Logic to list all public events
    res.status(200).json({ message: "List of public events" });
  } catch (error) {
    res.status(500).json({ error: "Failed to list public events" });
  }
};

export const getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // Logic to get specific event details
    res.status(200).json({ message: `Details of event ${id}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to get event details" });
  }
};

export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    // Logic to get event attendees
    res.status(200).json({ message: `Attendees of event ${eventId}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to get event attendees" });
  }
};

export const createTicketType = async (req, res) => {
  try {
    const { eventId } = req.params;
    // Logic to create ticket types
    res
      .status(201)
      .json({ message: `Ticket type created for event ${eventId}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to create ticket type" });
  }
};
