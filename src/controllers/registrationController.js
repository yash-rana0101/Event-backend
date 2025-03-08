import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import { sendEmail } from "../utils/emailService.js";
import Notification from "../models/Notification.js";

// @desc    Register user for event
// @route   POST /api/v1/registrations/events/:eventId
// @access  Private
export const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.userId;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event is published
    if (!event.isPublished) {
      return res
        .status(400)
        .json({ message: "Cannot register for unpublished event" });
    }

    // Check if registration date has passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "Event has already occurred" });
    }

    // Check if user is already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: userId,
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: "User already registered for this event" });
    }

    // Check if event has reached capacity
    if (event.capacity > 0) {
      const registrationsCount = await Registration.countDocuments({
        event: eventId,
      });
      if (registrationsCount >= event.capacity) {
        return res
          .status(400)
          .json({ message: "Event has reached maximum capacity" });
      }
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      user: userId,
      status: event.isPaid ? "pending" : "confirmed",
      paymentStatus: event.isPaid ? "pending" : "not_applicable",
    });

    // If event is free, confirm immediately
    if (!event.isPaid) {
      // Create notification for user
      await Notification.create({
        recipient: userId,
        type: "registration_confirmation",
        title: "Registration Confirmed",
        message: `Your registration for ${event.title} has been confirmed.`,
        relatedEvent: eventId,
      });

      // Send confirmation email
      await sendEmail({
        email: req.user.email,
        subject: `Registration Confirmed: ${event.title}`,
        message: `Thank you for registering for ${event.title} on ${new Date(event.date).toLocaleDateString()}. We look forward to seeing you!`,
      });
    }

    res.status(201).json({
      message: event.isPaid
        ? "Registration pending payment"
        : "Registration confirmed",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel registration
// @route   DELETE /api/v1/registrations/events/:eventId
// @access  Private
export const cancelRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.userId;

    // Find the registration
    const registration = await Registration.findOne({
      event: eventId,
      user: userId,
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Get event details to check date
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if cancellation is allowed (e.g., not too close to event date)
    const eventDate = new Date(event.date);
    const currentDate = new Date();
    const timeUntilEvent = eventDate.getTime() - currentDate.getTime();
    const daysUntilEvent = timeUntilEvent / (1000 * 3600 * 24);

    // If less than 24 hours until event, prevent cancellation
    if (daysUntilEvent < 1) {
      return res.status(400).json({
        message: "Cannot cancel registration less than 24 hours before event",
      });
    }

    // Update registration status
    registration.status = "cancelled";
    await registration.save();

    // Create notification
    await Notification.create({
      recipient: userId,
      type: "event_update",
      title: "Registration Cancelled",
      message: `Your registration for ${event.title} has been cancelled.`,
      relatedEvent: eventId,
    });

    // Send cancellation email
    await sendEmail({
      email: req.user.email,
      subject: `Registration Cancelled: ${event.title}`,
      message: `Your registration for ${event.title} on ${eventDate.toLocaleDateString()} has been cancelled.`,
    });

    res.status(200).json({ message: "Registration cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user registrations
// @route   GET /api/v1/registrations/user
// @access  Private
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    // Build filter
    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const registrations = await Registration.find(filter)
      .populate({
        path: "event",
        select: "title description date time location images",
      })
      .sort({ registrationDate: -1 });

    res.status(200).json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event registrations
// @route   GET /api/v1/registrations/events/:eventId
// @access  Private/Organizer/Admin
export const getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { status, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { event: eventId };
    if (status) {
      filter.status = status;
    }

    // Count total documents
    const total = await Registration.countDocuments(filter);

    // Find registrations with pagination
    const registrations = await Registration.find(filter)
      .populate({
        path: "user",
        select: "name email phone",
      })
      .sort({ registrationDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    res.status(200).json({
      registrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalRegistrations: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update registration status
// @route   PUT /api/v1/registrations/:id/status
// @access  Private/Organizer/Admin
export const updateRegistrationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const registration = await Registration.findById(req.params.id)
      .populate("user", "email")
      .populate("event", "title date");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    registration.status = status;

    // If confirmed, update attendance tracking
    if (status === "confirmed") {
      registration.paymentStatus = "completed";
    }

    await registration.save();

    // Create notification
    await Notification.create({
      recipient: registration.user._id,
      type: "registration_confirmation",
      title: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your registration for ${registration.event.title} is now ${status}.`,
      relatedEvent: registration.event._id,
    });

    // Send email notification
    await sendEmail({
      email: registration.user.email,
      subject: `Registration Update: ${registration.event.title}`,
      message: `Your registration status for ${registration.event.title} on ${new Date(registration.event.date).toLocaleDateString()} has been updated to ${status}.`,
    });

    res.status(200).json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get registration by ID
// @route   GET /api/v1/registrations/:id
// @access  Private/Admin
export const getRegistrationById = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("event", "title description date time location");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    res.status(200).json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark attendance
// @route   PUT /api/v1/registrations/:id/attendance
// @access  Private/Organizer/Admin
export const markAttendance = async (req, res) => {
  try {
    const { attended } = req.body;

    if (attended === undefined) {
      return res.status(400).json({ message: "Attendance status is required" });
    }

    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Only allow marking attendance for confirmed registrations
    if (registration.status !== "confirmed") {
      return res.status(400).json({
        message: "Can only mark attendance for confirmed registrations",
      });
    }

    registration.attendanceStatus = attended;
    await registration.save();

    res.status(200).json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
