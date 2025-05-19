import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// Register for an event
export const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    // Validate event ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event registration is open
    if (event.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Registration is closed for this event" });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: userId,
    });
    if (existingRegistration) {
      return res
        .status(409)
        .json({ message: "You are already registered for this event" });
    }

    // Check if event has capacity limit and if it's reached
    if (event.capacity) {
      const registrationsCount = await Registration.countDocuments({
        event: eventId,
        status: { $ne: "cancelled" },
      });
      if (registrationsCount >= event.capacity) {
        return res
          .status(400)
          .json({ message: "Event has reached maximum capacity" });
      }
    }

    // Create registration
    const registration = new Registration({
      user: userId,
      event: eventId,
      status: "confirmed",
      paymentStatus: event.isPaid ? "pending" : "free",
      ticketPrice: event.price || 0,
    });

    await registration.save();

    // Create notification for the user
    const notification = new Notification({
      recipient: userId,
      type: "registration_confirmation",
      title: "Registration Confirmed",
      message: `You have successfully registered for ${event.title}`,
      relatedEvent: eventId,
    });

    await notification.save();

    // Return success response
    res.status(201).json({
      message: "Successfully registered for the event",
      registration: {
        id: registration._id,
        status: registration.status,
        registrationDate: registration.registrationDate,
      },
    });
  } catch (error) {
    console.error("Error registering for event:", error);
    res.status(500).json({
      message: "Failed to register for event",
      error: error.message,
    });
  }
};

// Cancel registration
export const cancelRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const registration = await Registration.findOne({
      event: eventId,
      user: userId,
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    registration.status = "cancelled";
    await registration.save();

    res.status(200).json({
      message: "Registration cancelled successfully",
      registration: {
        id: registration._id,
        status: registration.status,
      },
    });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({
      message: "Failed to cancel registration",
      error: error.message,
    });
  }
};

/**
 * Check if user is registered for an event
 * @route GET /api/v1/registrations/check/:eventId
 * @access Private
 */
const checkRegistration = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  const registration = await Registration.findOne({
    user: userId,
    event: eventId
  });

  if (registration) {
    res.json({
      isRegistered: true,
      status: registration.status, // Include status in the response
      registrationId: registration._id
    });
  } else {
    res.json({
      isRegistered: false
    });
  }
};

/**
 * Get user's registrations
 * @route GET /api/v1/registrations/me
 * @access Private
 */
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;

    const registrations = await Registration.find({ user: userId })
      .populate("event", "title date startDate location status")
      .sort({ registrationDate: -1 });

    res.status(200).json(registrations);
  } catch (error) {
    console.error("Error getting user registrations:", error);
    res.status(500).json({
      message: "Failed to get registrations",
      error: error.message,
    });
  }
};

/**
 * Reactivate a previously cancelled registration
 * @route PATCH /api/v1/registrations/events/:eventId/reactivate
 * @access Private
 */
const reactivateRegistration = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  // Find the event
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  // Check if registration deadline has passed
  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    return res.status(400).json({ message: "Registration deadline has passed" });
  }

// Check if event capacity is full (if applicable)
if (event.capacity) {
  const activeRegistrationsCount = await Registration.countDocuments({
    event: eventId,
    status: { $in: ["confirmed", "attended"] }
  });
  
  if (activeRegistrationsCount >= event.capacity) {
    return res.status(400).json({ message: "Event has reached maximum capacity" });
  }
}

// Find existing registration (even if cancelled)
  let registration = await Registration.findOne({
    user: userId,
    event: eventId
  });

  if (!registration) {
    return res.status(404).json({ message: "No previous registration found" });
  }

  // If registration exists but wasn't cancelled, return appropriate response
  if (registration.status !== "cancelled") {
    return res.status(400).json({ 
      message: "Registration is already active",
      isRegistered: true,
      status: registration.status
    });
  }

  // Update the registration status from cancelled to confirmed
  registration.status = "confirmed";
  registration.updatedAt = new Date();
  await registration.save();

  // Increment event attendee count if it was decremented on cancellation
  if (!event.attendeesCount) event.attendeesCount = 0;
  event.attendeesCount += 1;
  await event.save();

  // Send success response
  res.status(200).json({
    message: "Registration successfully reactivated",
    isRegistered: true,
    status: "confirmed",
    registration
  });
};

export default {
  registerForEvent,
  cancelRegistration,
  checkRegistration,
  getUserRegistrations,
  reactivateRegistration
};
