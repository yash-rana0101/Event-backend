import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getUserProfile,
  updateUserProfile,
  getUserEvents,
  getUserProfileById,
  saveEvent,
  unsaveEvent,
} from "../controllers/userProfileController.js";
import {
  getDashboardOverview,
  getCalendarData,
} from "../controllers/userDashboardController.js";
import Registration from "../models/Registration.js";
import SavedEvent from "../models/SavedEvent.js";

const router = Router();

// Public routes
router.get("/user/:userId", getUserProfileById);
// Add public endpoint for user's events
router.get(
  "/user/:userId/events",
  asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user's events from registrations with status that's not cancelled
      const registrations = await Registration.find({
        user: userId,
        status: { $ne: "cancelled" },
      }).populate("event");

      // Format the events data
      const events = registrations.map((reg) => ({
        id: reg.event?._id,
        title: reg.event?.title || "Unnamed Event",
        date: reg.event?.startDate || reg.registrationDate,
        location: reg.event?.location?.address || "No location specified",
        image: reg.event?.images?.[0] || null,
        status: reg.status,
      }));

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user events",
        error: error.message,
      });
    }
  })
);

// Protected routes
router.use(authMiddleware);

// Get current user profile
router.get("/me", asyncHandler(getUserProfile));

// Update current user profile
router.put("/me", asyncHandler(updateUserProfile));

// Get user dashboard overview
router.get("/me/dashboard", asyncHandler(getDashboardOverview));

// Get user events - this will handle the dashboard/events request
router.get(
  "/me/events",
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      // Get user's events from registrations
      const registrations = await Registration.find({
        user: userId,
        status: { $ne: "cancelled" },
      }).populate("event");

      // Format the events data
      const events = registrations.map((reg) => ({
        id: reg.event?._id,
        title: reg.event?.title || "Unnamed Event",
        date: reg.event?.startDate || reg.registrationDate,
        location: reg.event?.location?.address || "No location specified",
        image: reg.event?.images?.[0] || null,
        status: reg.status,
      }));

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user events",
        error: error.message,
      });
    }
  })
);

// Get saved events
router.get(
  "/saved-events",
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      // Get saved events
      const savedEventDocs = await SavedEvent.find({ user: userId }).populate(
        "event"
      );

      // Format the response
      const savedEvents = savedEventDocs.map((doc) => ({
        id: doc.event?._id,
        title: doc.event?.title || "Unnamed Event",
        date: doc.event?.startDate,
        location: doc.event?.location?.address || "No location specified",
        image: doc.event?.images?.[0] || null,
        savedAt: doc.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: savedEvents,
      });
    } catch (error) {
      console.error("Error fetching saved events:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch saved events",
        error: error.message,
      });
    }
  })
);

// Get calendar data
router.get(
  "/me/calendar",
  asyncHandler(async (req, res) => {
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

      // Get registrations for events in the specified month
      const registrations = await Registration.find({
        user: userId,
        status: { $ne: "cancelled" },
      }).populate("event");

      // Filter events in the target month
      const eventsInMonth = registrations.filter((reg) => {
        if (!reg.event || !reg.event.startDate) return false;
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
        const eventsOnDay = eventsInMonth.filter((reg) => {
          const eventDate = new Date(reg.event.startDate);
          return eventDate.getDate() === day;
        });

        calendarDays.push({
          day,
          status: eventsOnDay.length > 0 ? "present" : "absent",
          events: eventsOnDay.map((reg) => ({
            id: reg.event._id,
            title: reg.event.title,
            time: new Date(reg.event.startDate).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        });
      }

      res.status(200).json({
        success: true,
        data: {
          month: targetMonth + 1,
          year: targetYear,
          calendarDays,
        },
      });
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch calendar data",
        error: error.message,
      });
    }
  })
);

// Get recommendations
router.get(
  "/me/recommendations",
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      // Here we would normally fetch personalized recommendations
      // For now, just return some sample events
      const sampleRecommendations = await SavedEvent.find()
        .limit(5)
        .populate("event");

      const recommendations = sampleRecommendations.map((item) => ({
        id: item.event?._id,
        title: item.event?.title || "Event recommendation",
        image: item.event?.images?.[0] || null,
        date: item.event?.startDate,
        location: item.event?.location?.address || "No location specified",
      }));

      res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recommendations",
        error: error.message,
      });
    }
  })
);

// Save an event
router.post("/me/events/:eventId/save", asyncHandler(saveEvent));

// Unsave an event
router.delete("/me/events/:eventId/save", asyncHandler(unsaveEvent));

// Get user events
router.get("/me/events", asyncHandler(getUserEvents));

// Get user attended events (public)
router.get(
  "/user/:userId/attended-events",
  asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user profile
      const userProfile = await UserProfile.findOne({ user: userId });

      if (!userProfile) {
        // If no profile exists, get attended events directly from registrations
        const registrations = await Registration.find({
          user: userId,
          attendanceStatus: true,
        }).populate("event");

        // Format the attended events
        const attendedEvents = registrations.map((reg) => ({
          eventId: reg.event._id,
          name: reg.event.title,
          date: new Date(reg.event.startDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          type: reg.event.category,
          image: reg.event.image || "/api/placeholder/80/80",
          location: reg.event.location?.address || "Online",
        }));

        return res.status(200).json({
          success: true,
          data: attendedEvents,
          count: attendedEvents.length,
        });
      }

      // Return attended events from profile
      res.status(200).json({
        success: true,
        data: userProfile.attendedEvents || [],
        count: (userProfile.attendedEvents || []).length,
      });
    } catch (error) {
      console.error("Error fetching user attended events:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch attended events",
        error: error.message,
      });
    }
  })
);

export default router;
