import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import SavedEvent from "../models/SavedEvent.js";

// Calculate and assign badges to user based on activity
export const calculateUserBadges = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ user: userId });
    if (!profile) return null;

    const badges = [];

    // Event Explorer Badge - based on different event types attended
    const eventTypes = new Set(
      profile.attendedEvents.map((event) => event.type)
    );
    if (eventTypes.size >= 3) {
      badges.push({
        name: "Event Explorer",
        description: "Attended events of multiple types",
        type: "attendance",
        level: Math.min(Math.floor(eventTypes.size / 3), 5),
      });
    }

    // Feedback Champion Badge - based on reviews
    const reviewCount = profile.attendedEvents.filter(
      (event) => event.review
    ).length;
    if (reviewCount >= 5) {
      badges.push({
        name: "Feedback Champion",
        description: "Left reviews for multiple events",
        type: "review",
        level: Math.min(Math.floor(reviewCount / 5), 5),
      });
    }

    // Event Enthusiast Badge - based on number of events attended
    if (profile.eventsAttended >= 5) {
      badges.push({
        name: "Event Enthusiast",
        description: "Attended multiple events",
        type: "attendance",
        level: Math.min(Math.floor(profile.eventsAttended / 5), 5),
      });
    }

    // Photo Share Badge - based on event photos shared
    if (profile.eventPhotos >= 10) {
      badges.push({
        name: "Photo Enthusiast",
        description: "Shared photos from events",
        type: "achievement",
        level: Math.min(Math.floor(profile.eventPhotos / 10), 5),
      });
    }

    // Early Adopter Badge (if user joined early)
    const joinDate = new Date(profile.joinDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (joinDate < oneYearAgo) {
      badges.push({
        name: "Early Adopter",
        description: "Among first users on platform",
        type: "special",
        level: 1,
      });
    }

    // Update badges in profile
    profile.badges = badges;
    await profile.save();

    return badges;
  } catch (error) {
    console.error("Error calculating badges:", error);
    return null;
  }
};

// Sync user's event registrations with their profile
export const syncUserEvents = async (userId) => {
  try {
    // Get user's registrations
    const registrations = await Registration.find({
      user: userId,
    }).populate("event");

    // Get user profile
    let profile = await UserProfile.findOne({ user: userId });
    if (!profile) {
      const user = await User.findById(userId);
      if (!user) return null;

      // Create default profile
      profile = new UserProfile({
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
        notificationPreferences: [
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
        ],
      });
      await profile.save();
    }

    // Update events attended count
    profile.eventsAttended = registrations.length;

    // Update upcoming events count
    const now = new Date();
    profile.upcomingEvents = registrations.filter(
      (reg) => new Date(reg.event.startDate) > now
    ).length;

    // Update attended and upcoming events lists
    profile.attendedEvents = registrations
      .filter((reg) => new Date(reg.event.startDate) <= now)
      .map((reg) => ({
        eventId: reg.event._id,
        name: reg.event.title,
        date: reg.event.startDate,
        type: reg.event.category,
        image: reg.event.image,
        location: reg.event.location?.address || "Online",
        rating: null,
        review: null,
        photos: [],
      }));

    profile.upcomingEventsList = registrations
      .filter((reg) => new Date(reg.event.startDate) > now)
      .map((reg) => ({
        eventId: reg.event._id,
        name: reg.event.title,
        date: reg.event.startDate,
        type: reg.event.category,
        image: reg.event.image,
        location: reg.event.location?.address || "Online",
        ticketType: reg.ticketType || "Standard",
      }));

    await profile.save();
    return profile;
  } catch (error) {
    console.error("Error syncing user events:", error);
    return null;
  }
};

// Generate event recommendations based on user interests and past events
export const generateRecommendations = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ user: userId });
    if (!profile) return [];

    // Get user interests
    const interests = profile.interests || [];

    // Get event types the user has attended
    const attendedEventTypes = profile.attendedEvents.map(
      (event) => event.type
    );

    // Find upcoming events that match user interests or past event types
    let query = {
      startDate: { $gt: new Date() },
      isPublished: true,
    };

    if (interests.length > 0 || attendedEventTypes.length > 0) {
      query.$or = [];

      if (interests.length > 0) {
        // Add interest-based filters
        query.$or.push({
          category: {
            $in: interests.map((interest) => new RegExp(interest, "i")),
          },
        });

        // Add tag-based filters
        query.$or.push({
          tags: {
            $in: interests.map((interest) => new RegExp(interest, "i")),
          },
        });
      }

      if (attendedEventTypes.length > 0) {
        // Add category-based filters from past events
        query.$or.push({
          category: {
            $in: attendedEventTypes,
          },
        });
      }
    }

    // Get user's already registered event IDs
    const registrations = await Registration.find({ user: userId });
    const registeredEventIds = registrations.map((reg) => reg.event.toString());

    // Exclude already registered events
    if (registeredEventIds.length > 0) {
      query._id = { $nin: registeredEventIds };
    }

    // Find recommendations
    let recommendations = await Event.find(query)
      .sort({ startDate: 1 })
      .limit(5);

    // If not enough recommendations found, add popular events
    if (recommendations.length < 5) {
      const remainingCount = 5 - recommendations.length;
      const existingIds = recommendations.map((event) => event._id.toString());

      // Find popular events that are not already in recommendations
      const popularEvents = await Event.find({
        startDate: { $gt: new Date() },
        isPublished: true,
        _id: { $nin: [...registeredEventIds, ...existingIds] },
      })
        .sort({ attendeesCount: -1 })
        .limit(remainingCount);

      recommendations = [...recommendations, ...popularEvents];
    }

    // Format recommendations
    return recommendations.map((event) => ({
      id: event._id,
      title: event.title,
      date: new Date(event.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      location: event.location?.address || "Online",
      image: event.image || "/api/placeholder/300/200",
    }));
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [];
  }
};
