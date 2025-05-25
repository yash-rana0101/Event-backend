import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";

// @desc    Get event attendance report
// @route   GET /api/reports/events/:eventId/attendance
// @access  Private/EventOrganizer
export const getEventAttendanceReport = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get all registrations for this event
    const registrations = await Registration.find({
      event: eventId,
    })
      .populate("user", "name email phone")
      .sort("registrationDate");

    // Get attendees (confirmed registrations)
    const attendees = registrations
      .filter((reg) => reg.status === "confirmed" || reg.status === "attended")
      .map((reg) => ({
        _id: reg._id,
        name: reg.user?.name || "Anonymous User",
        email: reg.user?.email || "No email provided",
        phone: reg.user?.phone || null,
        ticketType: reg.ticketType || "Regular",
        checkInStatus:
          reg.status === "attended" ? "checked-in" : "not-checked-in",
        checkInTime: reg.attendanceDate || null,
        registrationDate: reg.registrationDate || reg.createdAt,
      }));

    // Calculate statistics
    const totalRegistrations = registrations.length;
    const confirmedAttendees = registrations.filter(
      (reg) => reg.status === "confirmed" || reg.status === "attended"
    ).length;
    const checkedInAttendees = registrations.filter(
      (reg) => reg.status === "attended"
    ).length;
    const cancelledRegistrations = registrations.filter(
      (reg) => reg.status === "cancelled"
    ).length;

    const response = {
      event: {
        id: event._id,
        title: event.title,
        date: event.startDate,
        capacity: event.capacity || 0,
      },
      statistics: {
        totalRegistrations,
        confirmedAttendees,
        checkedInAttendees,
        cancelledRegistrations,
        checkInRate:
          confirmedAttendees > 0
            ? Math.round((checkedInAttendees / confirmedAttendees) * 100)
            : 0,
      },
      attendees,
      registrations,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching attendance report:", error);
    res.status(500).json({
      message: "Failed to fetch attendance report",
      error: error.message,
    });
  }
};

// @desc    Get revenue report
// @route   GET /api/reports/revenue
// @access  Private/Admin
export const getRevenueReport = async (req, res) => {
  try {
    const events = await Event.find({}).select("title price");
    const revenue = events.reduce((acc, event) => acc + event.price, 0);

    res.status(200).json({ totalRevenue: revenue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get registration statistics
// @route   GET /api/reports/events/:eventId/registrations
// @access  Private/EventOrganizer
export const getRegistrationStatistics = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const confirmedCount = await Registration.countDocuments({
      event: eventId,
      status: "confirmed",
    });
    const waitlistedCount = await Registration.countDocuments({
      event: eventId,
      status: "waitlisted",
    });

    res.status(200).json({ confirmedCount, waitlistedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get event popularity report
// @route   GET /api/reports/popularity
// @access  Private/Admin
export const getEventPopularityReport = async (req, res) => {
  try {
    const events = await Event.find({}).select("title");
    const popularity = await Promise.all(
      events.map(async (event) => {
        const registrationCount = await Registration.countDocuments({
          event: event._id,
        });
        return { event: event.title, registrationCount };
      })
    );

    res.status(200).json(popularity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user activity report
// @route   GET /api/reports/user-activity
// @access  Private/Admin
export const getUserActivityReport = async (req, res) => {
  try {
    const users = await User.find({}).select("name email");
    const activity = await Promise.all(
      users.map(async (user) => {
        const registrationCount = await Registration.countDocuments({
          user: user._id,
        });
        return { user: user.name, registrationCount };
      })
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export registration data
// @route   GET /api/reports/events/:eventId/export
// @access  Private/EventOrganizer
export const exportRegistrationData = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const registrations = await Registration.find({ event: eventId })
      .populate("user", "name email")
      .sort("registrationDate");

    // Convert to CSV or any other format as needed
    const csvData = registrations.map((reg) => ({
      name: reg.user.name,
      email: reg.user.email,
      status: reg.status,
      registrationDate: reg.registrationDate,
    }));

    res.status(200).json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
