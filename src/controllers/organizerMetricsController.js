import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import ApiResponse from "../utils/apiResponse.js";

/**
 * Get organizer dashboard metrics
 * @route GET /api/v1/organizer/metrics
 * @access Private - Organizer only
 */
export const getOrganizerMetrics = async (req, res) => {
  try {
    const organizerId =
      req.organizer?._id || req.user?._id || req.organizer?.id || req.user?.id;

    if (!organizerId) {
      return ApiResponse.unauthorized(
        res,
        "Authentication failed. No valid organizer ID found."
      );
    }

    // Get all events by this organizer
    const events = await Event.find({ organizer: organizerId });
    const eventIds = events.map((event) => event._id);

    // Get all registrations for organizer's events
    const registrations = await Registration.find({
      event: { $in: eventIds },
    });

    // Calculate current month and previous month for comparison
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month data
    const currentMonthEvents = events.filter(
      (event) => new Date(event.createdAt) >= currentMonthStart
    );
    const currentMonthRegistrations = registrations.filter(
      (reg) => new Date(reg.createdAt) >= currentMonthStart
    );

    // Previous month data
    const previousMonthEvents = events.filter(
      (event) =>
        new Date(event.createdAt) >= previousMonthStart &&
        new Date(event.createdAt) <= previousMonthEnd
    );
    const previousMonthRegistrations = registrations.filter(
      (reg) =>
        new Date(reg.createdAt) >= previousMonthStart &&
        new Date(reg.createdAt) <= previousMonthEnd
    );

    // Calculate metrics
    const totalEvents = events.length;
    const totalAttendees = registrations.length;
    const checkedInAttendees = registrations.filter(
      (reg) => reg.status === "attended"
    ).length;
    const cancelledEvents = events.filter(
      (event) => event.status === "cancelled"
    ).length;

    // Calculate completion rate (events that have ended vs total events)
    const completedEvents = events.filter((event) => {
      const eventEndDate = new Date(event.endDate || event.startDate);
      return eventEndDate < now && event.status !== "cancelled";
    }).length;
    const completionRate =
      totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const eventsChange = calculateChange(
      currentMonthEvents.length,
      previousMonthEvents.length
    );
    const attendeesChange = calculateChange(
      currentMonthRegistrations.length,
      previousMonthRegistrations.length
    );
    const completionChange = calculateChange(
      currentMonthEvents.filter((e) => new Date(e.endDate || e.startDate) < now)
        .length,
      previousMonthEvents.filter(
        (e) => new Date(e.endDate || e.startDate) < previousMonthEnd
      ).length
    );
    const cancellationChange = calculateChange(
      currentMonthEvents.filter((e) => e.status === "cancelled").length,
      previousMonthEvents.filter((e) => e.status === "cancelled").length
    );

    // Format percentage strings
    const formatChange = (change) => {
      if (change === 0) return "0%";
      return change > 0 ? `+${change}%` : `${change}%`;
    };

    const metrics = {
      totalEvents: {
        value: totalEvents,
        change: formatChange(eventsChange),
        trend: eventsChange >= 0 ? "up" : "down",
      },
      totalAttendees: {
        value: totalAttendees,
        change: formatChange(attendeesChange),
        trend: attendeesChange >= 0 ? "up" : "down",
      },
      completionRate: {
        value: `${completionRate}%`,
        change: formatChange(completionChange),
        trend: completionChange >= 0 ? "up" : "down",
      },
      cancellations: {
        value: cancelledEvents,
        change: formatChange(-cancellationChange), // Negative because fewer cancellations is better
        trend: cancellationChange <= 0 ? "up" : "down",
      },
    };

    // Additional detailed metrics
    const detailedMetrics = {
      eventsByStatus: {
        active: events.filter((e) => e.status === "active").length,
        completed: completedEvents,
        cancelled: cancelledEvents,
        pending: events.filter((e) => e.status === "pending").length,
      },
      registrationsByStatus: {
        confirmed: registrations.filter((r) => r.status === "confirmed").length,
        attended: checkedInAttendees,
        cancelled: registrations.filter((r) => r.status === "cancelled").length,
        pending: registrations.filter((r) => r.status === "pending").length,
      },
      monthlyTrends: {
        currentMonth: {
          events: currentMonthEvents.length,
          registrations: currentMonthRegistrations.length,
        },
        previousMonth: {
          events: previousMonthEvents.length,
          registrations: previousMonthRegistrations.length,
        },
      },
      averageAttendeesPerEvent:
        totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
      checkInRate:
        totalAttendees > 0
          ? Math.round((checkedInAttendees / totalAttendees) * 100)
          : 0,
    };

    return ApiResponse.success(
      res,
      "Organizer metrics retrieved successfully",
      {
        metrics,
        detailedMetrics,
        lastUpdated: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error fetching organizer metrics:", error);
    return ApiResponse.serverError(res, "Failed to retrieve organizer metrics");
  }
};

/**
 * Get organizer revenue metrics
 * @route GET /api/v1/organizer/metrics/revenue
 * @access Private - Organizer only
 */
export const getRevenueMetrics = async (req, res) => {
  try {
    const organizerId =
      req.organizer?._id || req.user?._id || req.organizer?.id || req.user?.id;

    if (!organizerId) {
      return ApiResponse.unauthorized(res, "Authentication failed.");
    }

    // Get all events by this organizer
    const events = await Event.find({ organizer: organizerId });
    const eventIds = events.map((event) => event._id);

    // Get paid registrations
    const paidRegistrations = await Registration.find({
      event: { $in: eventIds },
      paymentStatus: "paid",
    });

    // Calculate revenue metrics
    const totalRevenue = paidRegistrations.reduce(
      (sum, reg) => sum + (reg.ticketPrice || 0),
      0
    );
    const averageTicketPrice =
      paidRegistrations.length > 0
        ? Math.round(totalRevenue / paidRegistrations.length)
        : 0;

    // Monthly revenue calculation
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthRevenue = paidRegistrations
      .filter((reg) => new Date(reg.createdAt) >= currentMonthStart)
      .reduce((sum, reg) => sum + (reg.ticketPrice || 0), 0);

    const revenueMetrics = {
      totalRevenue,
      currentMonthRevenue,
      averageTicketPrice,
      paidRegistrations: paidRegistrations.length,
      freeRegistrations: await Registration.countDocuments({
        event: { $in: eventIds },
        paymentStatus: "free",
      }),
    };

    return ApiResponse.success(
      res,
      "Revenue metrics retrieved successfully",
      revenueMetrics
    );
  } catch (error) {
    console.error("Error fetching revenue metrics:", error);
    return ApiResponse.serverError(res, "Failed to retrieve revenue metrics");
  }
};

// Export the controller methods as an object to match how it's imported in the routes
export const organizerMetricsController = {
  getOrganizerMetrics,
  getRevenueMetrics,
};

// Also keep the default export for backward compatibility
export default {
  getOrganizerMetrics,
  getRevenueMetrics,
};
