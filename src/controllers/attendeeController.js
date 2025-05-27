import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import ApiResponse from "../utils/apiResponse.js";

/**
 * Get all attendees for a specific event
 * @route GET /api/v1/organizer/events/:eventId/attendees
 * @access Private - Event organizer only
 */
export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get organizer ID from either req.organizer or req.user - fix the order
    const organizerId = req.organizer?._id || req.user?._id;

    if (!organizerId) {
      return ApiResponse.unauthorized(
        res,
        "Authentication failed. No valid organizer ID found."
      );
    }

    // Verify the event exists and belongs to the organizer
    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return ApiResponse.notFound(
        res,
        "Event not found or you don't have permission to access it"
      );
    }

    // Get all registrations for this event
    const registrations = await Registration.find({ event: eventId })
      .populate("user", "name email phone")
      .lean();

    // Transform registrations into attendee objects
    const attendees = registrations.map((reg) => ({
      _id: reg._id,
      name: reg.user?.name || "Anonymous User",
      email: reg.user?.email || "No email provided",
      phone: reg.user?.phone || null,
      ticketType: reg.ticketType || "Regular",
      checkInStatus:
        reg.status === "attended"
          ? "checked-in"
          : reg.status === "cancelled"
          ? "cancelled"
          : reg.status === "pending"
          ? "pending"
          : "not-checked-in",
      checkInTime: reg.attendanceDate || null,
      registrationDate: reg.registrationDate || reg.createdAt,
      additionalInfo: reg.additionalInfo || {},
    }));

    return ApiResponse.success(
      res,
      "Event attendees retrieved successfully",
      attendees
    );
  } catch (error) {
    console.error("Error getting event attendees:", error);
    return ApiResponse.serverError(res, "Failed to retrieve attendees");
  }
};

/**
 * Update attendee check-in status
 * @route POST /api/v1/organizer/events/:eventId/attendees/:attendeeId/check-in
 * @access Private - Event organizer only
 */
export const updateAttendeeCheckIn = async (req, res) => {
  try {
    const { eventId, attendeeId } = req.params;
    const { status } = req.body;

    // Get organizer ID from either req.organizer or req.user - fix the order
    const organizerId = req.organizer?._id || req.user?._id;

    if (!organizerId) {
      return ApiResponse.unauthorized(
        res,
        "Authentication failed. No valid organizer ID found."
      );
    }

    if (!["checked-in", "not-checked-in", "cancelled"].includes(status)) {
      return ApiResponse.badRequest(res, "Invalid check-in status");
    }

    // Verify the event exists and belongs to the organizer
    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return ApiResponse.notFound(
        res,
        "Event not found or you don't have permission to access it"
      );
    }

    // Find and update the registration
    const registration = await Registration.findById(attendeeId);
    if (!registration || registration.event.toString() !== eventId) {
      return ApiResponse.notFound(res, "Attendee not found for this event");
    }

    // Map API status values to database status values
    const dbStatus =
      status === "checked-in"
        ? "attended"
        : status === "not-checked-in"
        ? "confirmed"
        : "cancelled";

    // Update the registration status
    registration.status = dbStatus;

    // Set or clear attendance date
    if (status === "checked-in") {
      registration.attendanceDate = new Date();
    } else if (status === "not-checked-in") {
      registration.attendanceDate = null;
    }

    await registration.save();

    return ApiResponse.success(
      res,
      `Attendee ${
        status === "checked-in"
          ? "checked in"
          : status === "not-checked-in"
          ? "check-in removed"
          : "cancelled"
      } successfully`,
      {
        attendeeId: registration._id,
        status,
        checkInTime:
          status === "checked-in" ? registration.attendanceDate : null,
      }
    );
  } catch (error) {
    console.error("Error updating attendee check-in:", error);
    return ApiResponse.serverError(
      res,
      "Failed to update attendee check-in status"
    );
  }
};

/**
 * Add a new attendee manually to an event
 * @route POST /api/v1/organizer/events/:eventId/attendees
 * @access Private - Event organizer only
 */
export const addAttendeeManually = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, email, phone, ticketType } = req.body;

    // Get organizer ID from either req.organizer or req.user - fix the order
    const organizerId = req.organizer?._id || req.user?._id;

    if (!organizerId) {
      return ApiResponse.unauthorized(
        res,
        "Authentication failed. No valid organizer ID found."
      );
    }

    // Verify the event exists and belongs to the organizer
    const event = await Event.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      return ApiResponse.notFound(
        res,
        "Event not found or you don't have permission to access it"
      );
    }

    // Check if the user already exists
    let user = await User.findOne({ email });

    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({
        name,
        email,
        phone: phone || "",
        isManual: true, // Flag to identify manually added users
      });
      await user.save();
    }

    // Check if the registration already exists
    const existingRegistration = await Registration.findOne({
      user: user._id,
      event: eventId,
    });

    if (existingRegistration) {
      return ApiResponse.badRequest(
        res,
        "This user is already registered for this event"
      );
    }

    // Create a new registration
    const registration = new Registration({
      user: user._id,
      event: eventId,
      status: "confirmed",
      ticketType: ticketType || "Regular",
      paymentStatus: "free",
      registrationDate: new Date(),
      isManualEntry: true, // Flag to identify manually added registrations
    });

    await registration.save();

    // Increment event attendee count
    event.attendeesCount = (event.attendeesCount || 0) + 1;
    await event.save();

    // Return the newly created attendee
    return ApiResponse.created(res, "Attendee added successfully", {
      _id: registration._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      ticketType: registration.ticketType,
      checkInStatus: "not-checked-in",
      registrationDate: registration.registrationDate,
    });
  } catch (error) {
    console.error("Error adding attendee:", error);
    return ApiResponse.serverError(res, "Failed to add attendee");
  }
};

export default {
  getEventAttendees,
  updateAttendeeCheckIn,
  addAttendeeManually,
};
