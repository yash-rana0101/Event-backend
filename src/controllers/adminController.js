import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Organizer from "../models/organizerModel.js";
import OrganizerDetails from "../models/organizerDetailsModel.js";
import SavedEvent from "../models/SavedEvent.js";
import ApiResponse from "../utils/apiResponse.js";

// Dashboard Overview
export const getDashboardOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalRegistrations,
      pendingOrganizers,
      pendingEvents,
      activeEvents,
      completedEvents,
      recentUsers,
      recentEvents,
    ] = await Promise.all([
      User.countDocuments(),
      Organizer.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(),
      Organizer.countDocuments({ status: "pending" }),
      Event.countDocuments({ status: "pending" }),
      Event.countDocuments({ status: "active" }),
      Event.countDocuments({ status: "completed" }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email createdAt role"),
      Event.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("organizer", "name")
        .select("title status createdAt organizer"),
    ]);

    // Calculate growth metrics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      currentMonthUsers,
      lastMonthUsers,
      currentMonthEvents,
      lastMonthEvents,
      currentMonthRegistrations,
      lastMonthRegistrations,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: currentMonth } }),
      User.countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth },
      }),
      Event.countDocuments({ createdAt: { $gte: currentMonth } }),
      Event.countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth },
      }),
      Registration.countDocuments({ createdAt: { $gte: currentMonth } }),
      Registration.countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth },
      }),
    ]);

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const dashboardData = {
      overview: {
        totalUsers: {
          count: totalUsers,
          growth: calculateGrowth(currentMonthUsers, lastMonthUsers),
        },
        totalOrganizers: {
          count: totalOrganizers,
          pending: pendingOrganizers,
        },
        totalEvents: {
          count: totalEvents,
          growth: calculateGrowth(currentMonthEvents, lastMonthEvents),
          active: activeEvents,
          completed: completedEvents,
          pending: pendingEvents,
        },
        totalRegistrations: {
          count: totalRegistrations,
          growth: calculateGrowth(
            currentMonthRegistrations,
            lastMonthRegistrations
          ),
        },
      },
      recentActivity: {
        users: recentUsers,
        events: recentEvents,
      },
      pendingApprovals: {
        organizers: pendingOrganizers,
        events: pendingEvents,
      },
    };

    return ApiResponse.success(
      res,
      "Dashboard overview retrieved successfully",
      dashboardData
    );
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return ApiResponse.error(res, "Failed to fetch dashboard overview", 500);
  }
};

// User Management
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    return ApiResponse.success(res, "Users retrieved successfully", {
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return ApiResponse.error(res, "Failed to fetch users", 500);
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    user.status = status;
    if (reason) user.statusReason = reason;
    user.statusUpdatedBy = req.admin._id;
    user.statusUpdatedAt = new Date();

    await user.save();

    return ApiResponse.success(res, `User ${status} successfully`, user);
  } catch (error) {
    console.error("Error updating user status:", error);
    return ApiResponse.error(res, "Failed to update user status", 500);
  }
};

// Organizer Management
export const getAllOrganizers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { organization: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;

    const organizers = await Organizer.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalOrganizers = await Organizer.countDocuments(query);

    return ApiResponse.success(res, "Organizers retrieved successfully", {
      organizers,
      pagination: {
        total: totalOrganizers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalOrganizers / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching organizers:", error);
    return ApiResponse.error(res, "Failed to fetch organizers", 500);
  }
};

export const approveOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const { approved, reason } = req.body;

    const organizer = await Organizer.findById(organizerId);
    if (!organizer) {
      return ApiResponse.notFound(res, "Organizer not found");
    }

    organizer.status = approved ? "approved" : "rejected";
    organizer.approvalReason = reason;
    organizer.approvedBy = req.admin._id;
    organizer.approvedAt = new Date();

    await organizer.save();

    return ApiResponse.success(
      res,
      `Organizer ${approved ? "approved" : "rejected"} successfully`,
      organizer
    );
  } catch (error) {
    console.error("Error updating organizer status:", error);
    return ApiResponse.error(res, "Failed to update organizer status", 500);
  }
};

export const deleteOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    // Check if organizer has active events
    const activeEvents = await Event.countDocuments({
      organizer: organizerId,
      status: { $in: ["active", "pending"] },
    });

    if (activeEvents > 0) {
      return ApiResponse.badRequest(
        res,
        "Cannot delete organizer with active events"
      );
    }

    await Organizer.findByIdAndDelete(organizerId);
    await OrganizerDetails.findOneAndDelete({ organizer: organizerId });

    return ApiResponse.success(res, "Organizer deleted successfully");
  } catch (error) {
    console.error("Error deleting organizer:", error);
    return ApiResponse.error(res, "Failed to delete organizer", 500);
  }
};

// Event Management
export const getAllEventsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      featured,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (featured !== undefined) query.featured = featured === "true";

    const events = await Event.find(query)
      .populate("organizer", "name organization")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalEvents = await Event.countDocuments(query);

    return ApiResponse.success(res, "Events retrieved successfully", {
      events,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalEvents / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return ApiResponse.error(res, "Failed to fetch events", 500);
  }
};

export const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { approved, reason, featured } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return ApiResponse.notFound(res, "Event not found");
    }

    event.status = approved ? "active" : "rejected";
    event.isPublished = approved;
    if (featured !== undefined) event.featured = featured;
    event.approvalReason = reason;
    event.approvedBy = req.admin._id;
    event.approvedAt = new Date();

    await event.save();

    return ApiResponse.success(
      res,
      `Event ${approved ? "approved" : "rejected"} successfully`,
      event
    );
  } catch (error) {
    console.error("Error updating event status:", error);
    return ApiResponse.error(res, "Failed to update event status", 500);
  }
};

export const deleteEventAdmin = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    // Check if event has registrations
    const registrations = await Registration.countDocuments({ event: eventId });

    const event = await Event.findById(eventId);
    if (!event) {
      return ApiResponse.notFound(res, "Event not found");
    }

    if (registrations > 0) {
      // If event has registrations, mark as cancelled instead of deleting
      event.status = "cancelled";
      event.cancellationReason = reason;
      event.cancelledBy = req.admin._id;
      event.cancelledAt = new Date();
      await event.save();

      return ApiResponse.success(
        res,
        "Event cancelled successfully due to existing registrations"
      );
    } else {
      await Event.findByIdAndDelete(eventId);
      await SavedEvent.deleteMany({ event: eventId });

      return ApiResponse.success(res, "Event deleted successfully");
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    return ApiResponse.error(res, "Failed to delete event", 500);
  }
};

// Analytics
export const getAnalytics = async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (timeRange) {
      case "7d":
        dateFilter = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1y":
        dateFilter = {
          $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    // User growth analytics
    const userGrowth = await User.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Event analytics
    const eventAnalytics = await Event.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalRegistrations: { $sum: "$attendeesCount" },
        },
      },
    ]);

    // Revenue analytics (if applicable)
    const revenueAnalytics = await Registration.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$ticketPrice" },
          totalPaidRegistrations: { $sum: 1 },
        },
      },
    ]);

    return ApiResponse.success(res, "Analytics retrieved successfully", {
      userGrowth,
      eventAnalytics,
      revenueAnalytics: revenueAnalytics[0] || {
        totalRevenue: 0,
        totalPaidRegistrations: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return ApiResponse.error(res, "Failed to fetch analytics", 500);
  }
};

// System Configuration
export const getSystemConfig = async (req, res) => {
  try {
    // This would typically come from a database or config file
    const config = {
      platformSettings: {
        platformName: "Cyber Hunter Events",
        maintenanceMode: false,
        registrationEnabled: true,
        maxEventsPerOrganizer: 50,
      },
      paymentSettings: {
        commissionRate: 5,
        paymentGateways: ["stripe", "paypal"],
        refundPolicy: "flexible",
      },
      emailSettings: {
        smtpEnabled: true,
        emailVerificationRequired: true,
        notificationsEnabled: true,
      },
    };

    return ApiResponse.success(
      res,
      "System configuration retrieved successfully",
      config
    );
  } catch (error) {
    console.error("Error fetching system config:", error);
    return ApiResponse.error(res, "Failed to fetch system configuration", 500);
  }
};

export const updateSystemConfig = async (req, res) => {
  try {
    const { config } = req.body;

    // In a real implementation, you would save this to a database
    // For now, we'll just return success

    return ApiResponse.success(
      res,
      "System configuration updated successfully",
      config
    );
  } catch (error) {
    console.error("Error updating system config:", error);
    return ApiResponse.error(res, "Failed to update system configuration", 500);
  }
};

export default {
  getDashboardOverview,
  getAllUsers,
  updateUserStatus,
  getAllOrganizers,
  approveOrganizer,
  deleteOrganizer,
  getAllEventsAdmin,
  approveEvent,
  deleteEventAdmin,
  getAnalytics,
  getSystemConfig,
  updateSystemConfig,
};
