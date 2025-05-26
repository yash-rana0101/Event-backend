import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Organizer from "../models/organizerModel.js";
import OrganizerDetails from "../models/organizerDetailsModel.js";
import SavedEvent from "../models/SavedEvent.js";
import ApiResponse from "../utils/apiResponse.js";
import { get } from "mongoose";

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

    // Only filter by status if it's not 'all'
    if (status && status !== "all") query.status = status;

    // Fetch organizers WITHOUT populate
    const organizers = await Organizer.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalOrganizers = await Organizer.countDocuments(query);

    // Fetch OrganizerDetails for all organizers in this page
    const organizerIds = organizers.map((org) => org._id);
    const detailsList = await OrganizerDetails.find({
      organizer: { $in: organizerIds },
    })
      .select("organizer location phone bio title company")
      .lean();

    // Map for quick lookup
    const detailsMap = {};
    detailsList.forEach((details) => {
      detailsMap[details.organizer.toString()] = details;
    });

    // Merge details into organizers
    const organizersWithDetails = organizers.map((org) => {
      const details = detailsMap[org._id.toString()] || {};
      return {
        ...org.toObject(),
        location: details.location || null,
        phone: details.phone || null,
        bio: details.bio || null,
        title: details.title || null,
        company: details.company || null,
      };
    });

    return ApiResponse.success(res, "Organizers retrieved successfully", {
      organizers: organizersWithDetails,
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

    if (approved) {
      organizer.status = "approved";
      organizer.verified = true; // Set verified to true when approved
      organizer.approvalReason = reason;
      organizer.approvedBy = req.user._id; // Use req.user instead of req.admin
      organizer.approvedAt = new Date();
    } else {
      organizer.status = "rejected";
      organizer.verified = false;
      organizer.approvalReason = reason;
      organizer.rejectedAt = new Date();
    }

    await organizer.save();

    return ApiResponse.success(
      res,
      `Organizer ${approved ? "approved" : "rejected"} successfully`,
      {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        status: organizer.status,
        verified: organizer.verified,
        approvalReason: organizer.approvalReason,
      }
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
      limit = 12,
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
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Map frontend status to backend status
    if (status && status !== "all") {
      if (status === "published") {
        query.isPublished = true;
      } else if (status === "draft") {
        query.isPublished = false;
      } else if (status === "suspended") {
        query.status = "suspended";
      } else if (status === "cancelled") {
        query.status = "cancelled";
      } else if (status === "completed") {
        query.status = "completed";
      }
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    const events = await Event.find(query)
      .populate({
        path: "organizer",
        select: "name organization email verified status",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Transform events data to match frontend format
    const transformedEvents = events.map((event) => {
      const eventObj = event.toObject();
      return {
        id: eventObj._id,
        title: eventObj.title,
        description: eventObj.description,
        organizer: eventObj.organizer?.name || "Unknown Organizer",
        organizerId: eventObj.organizer?._id,
        organizerCompany: eventObj.organizer?.organization,
        category: eventObj.category,
        status: eventObj.isPublished ? "published" : "draft",
        publishStatus: eventObj.isPublished ? "published" : "unpublished",
        startDate: eventObj.startDate
          ? new Date(eventObj.startDate).toISOString().split("T")[0]
          : eventObj.date,
        endDate: eventObj.endDate
          ? new Date(eventObj.endDate).toISOString().split("T")[0]
          : eventObj.date,
        startTime: "09:00", // Default time
        endTime: "18:00", // Default time
        location: eventObj.location?.address || "Not specified",
        city: eventObj.location?.city || "Not specified",
        country: eventObj.location?.country || "Not specified",
        ticketPrice: eventObj.price || 0,
        capacity: eventObj.capacity || 0,
        registeredCount: eventObj.attendeesCount || 0,
        revenue: `$${eventObj.attendeesCount * eventObj.price || 0}`,
        rating: 0, // Will be calculated from reviews
        reviewsCount: 0, // Will be calculated from reviews
        likesCount: eventObj.socialShare?.likes || 0,
        sharesCount: eventObj.socialShare?.shares || 0,
        image: eventObj.image || "/api/placeholder/400/250",
        tags: eventObj.tags || [],
        createdAt: eventObj.createdAt.toISOString().split("T")[0],
        lastModified: eventObj.updatedAt.toISOString().split("T")[0],
        featured: eventObj.featured || false,
        trending: false, // Can be calculated based on recent activity
      };
    });

    const totalEvents = await Event.countDocuments(query);

    // Calculate stats
    const totalEventsCount = await Event.countDocuments();
    const publishedCount = await Event.countDocuments({ isPublished: true });
    const draftCount = await Event.countDocuments({ isPublished: false });
    const totalRevenue = await Event.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$attendeesCount", "$price"] } },
        },
      },
    ]);

    return ApiResponse.success(res, "Events retrieved successfully", {
      events: transformedEvents,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalEvents / limit),
      },
      stats: {
        totalEvents: totalEventsCount,
        publishedEvents: publishedCount,
        draftEvents: draftCount,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return ApiResponse.error(res, "Failed to fetch events", 500);
  }
};

// Publish/Unpublish Event
export const updateEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, reason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return ApiResponse.notFound(res, "Event not found");
    }

    switch (action) {
      case "publish":
        event.isPublished = true;
        event.status = "active";
        break;
      case "unpublish":
        event.isPublished = false;
        event.status = "draft";
        break;
      case "suspend":
        event.status = "suspended";
        event.isPublished = false;
        break;
      case "feature":
        event.featured = !event.featured;
        break;
      default:
        return ApiResponse.badRequest(res, "Invalid action");
    }

    if (reason) {
      event.adminNotes = reason;
    }

    await event.save();

    return ApiResponse.success(res, `Event ${action}ed successfully`, {
      id: event._id,
      title: event.title,
      status: event.isPublished ? "published" : "draft",
      featured: event.featured,
    });
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

export const getOrganizerStats = async (req, res) => {
  try {
    const stats = await Organizer.aggregate([
      {
        $group: {
          _id: null,
          totalOrganizers: { $sum: 1 },
          approvedOrganizers: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          pendingOrganizers: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          rejectedOrganizers: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          suspendedOrganizers: {
            $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
          },
          blockedOrganizers: {
            $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
          },
          verifiedOrganizers: {
            $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] },
          },
          unverifiedOrganizers: {
            $sum: { $cond: [{ $eq: ["$verified", false] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalOrganizers: 0,
      approvedOrganizers: 0,
      pendingOrganizers: 0,
      rejectedOrganizers: 0,
      suspendedOrganizers: 0,
      blockedOrganizers: 0,
      verifiedOrganizers: 0,
      unverifiedOrganizers: 0,
    };

    // Calculate additional metrics
    const response = {
      ...result,
      // Active organizers are those who are approved and verified
      activeOrganizers: result.approvedOrganizers,
      // Inactive organizers include rejected, suspended, and blocked
      inactiveOrganizers:
        result.rejectedOrganizers +
        result.suspendedOrganizers +
        result.blockedOrganizers,
      // Verification rate
      verificationRate:
        result.totalOrganizers > 0
          ? Math.round(
              (result.verifiedOrganizers / result.totalOrganizers) * 100
            )
          : 0,
      // Approval rate
      approvalRate:
        result.totalOrganizers > 0
          ? Math.round(
              (result.approvedOrganizers / result.totalOrganizers) * 100
            )
          : 0,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching organizer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizer statistics",
    });
  }
};

export const updateOrganizerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const organizer = await Organizer.findById(id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // Update status and verified based on the action
    organizer.status = status;

    if (status === "approved") {
      organizer.verified = true;
      organizer.approvedBy = req.user._id;
      organizer.approvedAt = new Date();
    } else if (
      status === "rejected" ||
      status === "suspended" ||
      status === "blocked"
    ) {
      organizer.verified = false;
      if (status === "rejected") {
        organizer.rejectedAt = new Date();
      }
    }

    if (reason) {
      organizer.approvalReason = reason;
    }

    await organizer.save();

    res.status(200).json({
      success: true,
      data: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        status: organizer.status,
        verified: organizer.verified,
        approvalReason: organizer.approvalReason,
      },
    });
  } catch (error) {
    console.error("Error updating organizer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update organizer status",
    });
  }
};

// Fix the getOrganizerById function to be properly exported
export const getOrganizerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch organizer without populating events
    const organizer = await Organizer.findById(id).select("-password").lean();

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    // Fetch events for this organizer
    const events = await Event.find({ organizer: organizer._id })
      .select("title status startDate endDate attendeesCount revenue")
      .lean();

    // Get additional statistics
    const eventStats = await Event.aggregate([
      { $match: { organizer: organizer._id } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalAttendees: { $sum: "$attendeesCount" },
          totalRevenue: { $sum: "$revenue" },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const stats = eventStats[0] || {
      totalEvents: 0,
      totalAttendees: 0,
      totalRevenue: 0,
      avgRating: 0,
    };

    const enhancedOrganizer = {
      ...organizer,
      events, // add events array
      statistics: stats,
      avatar: organizer.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    };

    return res.status(200).json({
      success: true,
      data: enhancedOrganizer,
      message: "Organizer details fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching organizer by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organizer details",
    });
  }
};

// Event Details
export const getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate({
        path: "organizer",
        select: "name organization email verified status",
      })
      .lean();

    if (!event) {
      return ApiResponse.notFound(res, "Event not found");
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      event: eventId,
    });

    // Transform event data to match the expected format
    const eventDetails = {
      _id: event._id,
      id: event._id,
      title: event.title,
      description: event.description,
      tagline: event.tagline,
      organizer: event.organizer?._id,
      organizerId: event.organizer?._id,
      organizerName: event.organizer?.name || "Unknown Organizer",
      organizerLogo: event.organizerLogo,
      category: event.category,
      isPublished: event.isPublished,
      status: event.status,
      featured: event.featured || false,
      date: event.date,
      startDate: event.startDate || event.date,
      endDate: event.endDate || event.date,
      duration: event.duration,
      registrationDeadline: event.registrationDeadline,
      location: event.location,
      venue: event.venue,
      capacity: event.capacity || 0,
      attendeesCount: event.attendeesCount || 0,
      registeredCount: registrationCount,
      image: event.image,
      tags: event.tags || [],
      timeline: event.timeline || [],
      prizes: event.prizes || [],
      sponsors: event.sponsors || [],
      faqs: event.faqs || [],
      isPaid: event.isPaid || false,
      price: event.price || 0,
      currency: event.currency || "USD",
      socialStats: {
        likes: event.socialShare?.likes || 0,
        comments: event.socialShare?.comments || 0,
        shares: event.socialShare?.shares || 0,
        saved: event.socialShare?.saved || 0,
      },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return ApiResponse.success(
      res,
      "Event details retrieved successfully",
      eventDetails
    );
  } catch (error) {
    console.error("Error fetching event details:", error);
    return ApiResponse.error(res, "Failed to fetch event details", 500);
  }
};

// Export all controller functions for use in other modules
export default {
  getDashboardOverview,
  getAllUsers,
  updateUserStatus,
  getAllOrganizers,
  approveOrganizer,
  getOrganizerStats,
  updateOrganizerStatus,
  deleteOrganizer,
  getAllEventsAdmin,
  getEventDetails,
  updateEventStatus,
  getOrganizerById,
  deleteEventAdmin,
  getAnalytics,
  getSystemConfig,
  updateSystemConfig,
};
