import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import SavedEvent from "../models/SavedEvent.js";
import Notification from "../models/Notification.js";
import ApiResponse from "../utils/apiResponse.js";
import { generateRecommendations } from "../services/userProfileService.js";

// Get user dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get or create user profile
    let profile = await UserProfile.findOne({ user: userId });
    if (!profile) {
      const user = await User.findById(userId);
      if (!user) {
        return ApiResponse.notFound(res, "User not found");
      }

      // Create default profile
      profile = await createDefaultProfile(userId, user.name);
    }

    // Get upcoming events - remove status filter
    const registrations = await Registration.find({
      user: userId,
      // Removed the status: "confirmed" filter
    })
      .populate("event")
      .sort({ "event.startDate": 1 })
      .limit(3);

    const upcomingEvents = registrations.map((reg) => ({
      id: reg.event._id,
      title: reg.event.title,
      date: new Date(reg.event.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      location: reg.event.location?.address || "Online",
      image: reg.event.image || "/api/placeholder/300/200",
    }));

    // Get saved events
    const savedEventDocs = await SavedEvent.find({ user: userId })
      .populate("event")
      .sort({ savedAt: -1 })
      .limit(2);

    const savedEvents = savedEventDocs.map((doc) => ({
      id: doc.event._id,
      title: doc.event.title,
      date: new Date(doc.event.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      location: doc.event.location?.address || "Online",
      image: doc.event.image || "/api/placeholder/300/200",
    }));

    // Get notifications
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(3);

    const formattedNotifications = notifications.map((notif) => ({
      id: notif._id,
      message: notif.message,
      time: getTimeAgo(notif.createdAt),
    }));

    // Get recommendations
    const recommendations = await generateRecommendations(userId);

    // Create calendar data
    const currentDate = new Date();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        day,
        status: Math.random() > 0.3 ? "present" : "absent",
      });
    }

    const dashboardData = {
      upcomingEvents,
      savedEvents,
      notifications: formattedNotifications,
      recommendations,
      calendarDays,
      stats: {
        eventsAttended: profile.eventsAttended || 0,
        upcomingEvents: upcomingEvents.length,
        savedEvents: await SavedEvent.countDocuments({ user: userId }),
        eventPhotos: profile.eventPhotos || 0,
      },
    };

    return ApiResponse.success(
      res,
      "Dashboard data retrieved successfully",
      dashboardData
    );
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return ApiResponse.error(res, "Server error", 500);
  }
};

// Get calendar data
export const getCalendarData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    // Default to current month and year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Create start and end dates for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    // Get registrations for the month - remove status filter
    const registrations = await Registration.find({
      user: userId,
      // Removed the status: "confirmed" filter
    })
      .populate("event")
      .exec();

    // Filter events in the target month
    const eventsInMonth = registrations.filter((reg) => {
      const eventDate = new Date(reg.event.startDate);
      return (
        eventDate.getMonth() === targetMonth &&
        eventDate.getFullYear() === targetYear
      );
    });

    // Create calendar data
    const daysInMonth = endDate.getDate();
    const calendarDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const events = eventsInMonth.filter((reg) => {
        const eventDate = new Date(reg.event.startDate);
        return eventDate.getDate() === day;
      });

      calendarDays.push({
        day,
        status: events.length > 0 ? "present" : "absent",
        events: events.map((reg) => ({
          id: reg.event._id,
          title: reg.event.title,
          time: new Date(reg.event.startDate).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      });
    }

    return ApiResponse.success(res, "Calendar data retrieved successfully", {
      month: targetMonth + 1,
      year: targetYear,
      calendarDays,
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return ApiResponse.error(res, "Server error", 500);
  }
};

// Get user events
export const getUserEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get upcoming events - remove status filter
    const registrations = await Registration.find({
      user: userId,
      // Removed the status: "confirmed" filter
    })
      .populate("event")
      .sort({ "event.startDate": 1 });

    const events = registrations.map((reg) => ({
      id: reg.event._id,
      title: reg.event.title,
      date: new Date(reg.event.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      location: reg.event.location?.address || "Online",
      image: reg.event.image || "/api/placeholder/300/200",
    }));

    return ApiResponse.success(res, "Events retrieved successfully", events);
  } catch (error) {
    console.error("Error fetching user events:", error);
    return ApiResponse.error(res, "Server error", 500);
  }
};

// Get user saved events
export const getSavedEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get saved events
    const savedEventDocs = await SavedEvent.find({ user: userId })
      .populate("event")
      .sort({ savedAt: -1 });

    const savedEvents = savedEventDocs.map((doc) => ({
      id: doc.event._id,
      title: doc.event.title,
      date: new Date(doc.event.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      location: doc.event.location?.address || "Online",
      image: doc.event.image || "/api/placeholder/300/200",
    }));

    return ApiResponse.success(
      res,
      "Saved events retrieved successfully",
      savedEvents
    );
  } catch (error) {
    console.error("Error fetching saved events:", error);
    return ApiResponse.error(res, "Server error", 500);
  }
};

// Get recommendations
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    const recommendations = await generateRecommendations(userId);

    return ApiResponse.success(
      res,
      "Recommendations retrieved successfully",
      recommendations
    );
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return ApiResponse.error(res, "Server error", 500);
  }
};

// Helper function to format time ago
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000; // seconds in a year
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000; // seconds in a month
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400; // seconds in a day
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600; // seconds in an hour
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60; // seconds in a minute
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
};

// Helper function to create default profile
const createDefaultProfile = async (userId, userName) => {
  const defaultPreferences = [
    {
      type: "event_reminder",
      name: "Event Reminders",
      enabled: true,
      description: "Get notified 24 hours before events",
    },
    {
      type: "new_event",
      name: "New Events",
      enabled: true,
      description: "Get notified when new events match your interests",
    },
    {
      type: "event_notification",
      name: "Friends' Activities",
      enabled: false,
      description: "Get notified when friends register for events",
    },
    {
      type: "admin_notification",
      name: "Promotions",
      enabled: true,
      description: "Get notified about discounts and special offers",
    },
  ];

  const profile = new UserProfile({
    user: userId,
    bio: "",
    location: "",
    joinDate: new Date(),
    eventsAttended: 0,
    upcomingEvents: 0,
    followers: 0,
    following: 0,
    interests: [],
    preferences: [],
    attendedEvents: [],
    upcomingEventsList: [],
    badges: [],
    savedEvents: 0,
    eventPhotos: 0,
    notificationPreferences: defaultPreferences,
  });

  return await profile.save();
};
