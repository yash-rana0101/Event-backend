import Organizer from "../models/organizerModel.js";
import Event from "../models/Event.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import OrganizerDetails from "../models/organizerDetailsModel.js";
import { getAllOrganizers } from "./adminController.js";

// Profile Management Functions
export const getProfile = async (req, res) => {
  try {
    const organizer = req.organizer || req.user;

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    const { password, ...organizerData } = organizer._doc || organizer;

    res.status(200).json({
      success: true,
      data: organizerData,
    });
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};

export const getOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.params.id;

    console.log("Fetching organizer profile for ID:", organizerId);

    const organizer = await Organizer.findById(organizerId).select("-password");

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    const organizerDetails = await OrganizerDetails.findOne({
      organizer: organizerId,
    });

    const events = await Event.find({ organizer: organizerId }).select(
      "title startDate location attendeesCount category status description highlights images price"
    );

    let testimonials = [];
    if (organizerDetails?.testimonials) {
      testimonials = organizerDetails.testimonials;
    }

    // Try to get additional testimonials from Feedback model
    try {
      const Feedback = mongoose.model("Feedback");
      const feedbacks = await Feedback.find({
        organizer: organizerId,
        type: "testimonial",
      })
        .populate("user", "name")
        .select("rating comment user createdAt")
        .sort({ createdAt: -1 })
        .limit(10);

      const feedbackTestimonials = feedbacks.map((feedback) => ({
        name: feedback.user?.name || "Anonymous",
        comment: feedback.comment,
        rating: feedback.rating,
        date: feedback.createdAt,
      }));

      testimonials = [...testimonials, ...feedbackTestimonials];
    } catch (feedbackError) {
      console.log("Feedback model not available:", feedbackError.message);
    }

    // Calculate statistics
    const totalEvents = events.length;
    const upcomingEvents = events.filter(
      (event) => new Date(event.startDate) > new Date()
    ).length;
    const completedEvents = events.filter(
      (event) =>
        new Date(event.startDate) <= new Date() && event.status !== "cancelled"
    ).length;
    const totalAttendees = events.reduce(
      (sum, event) => sum + (event.attendeesCount || 0),
      0
    );

    const profileResponse = {
      organizer: {
        _id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        createdAt: organizer.createdAt,
      },
      details: organizerDetails && {
        title: organizerDetails.title,
        company: organizerDetails.company,
        location: organizerDetails.location,
        phone: organizerDetails.phone,
        bio: organizerDetails.bio,
        expertise: organizerDetails.expertise,
        socials: organizerDetails.socials,
        certifications: organizerDetails.certifications,
        stats: {
          eventsHosted: organizerDetails.stats?.eventsHosted || totalEvents,
          totalAttendees:
            organizerDetails.stats?.totalAttendees || totalAttendees.toString(),
          clientSatisfaction:
            organizerDetails.stats?.clientSatisfaction || "0%",
          awards: organizerDetails.stats?.awards || 0,
        },
      },
      events,
      testimonials,
      statistics: {
        totalEvents,
        upcomingEvents,
        completedEvents,
        totalAttendees,
      },
    };

    res.status(200).json({
      success: true,
      data: profileResponse,
    });
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve organizer profile",
      error: error.message,
    });
  }
};

export const updateOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const updateData = req.body;

    const organizer = await Organizer.findById(organizerId);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    if (req.organizer._id.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    const updatedOrganizer = await Organizer.findByIdAndUpdate(
      organizerId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: updatedOrganizer,
    });
  } catch (error) {
    console.error("Error updating organizer profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// Authentication Functions
export const registerOrganizer = async (req, res) => {
  try {
    const { name, email, password, organization, phone } = req.body;

    if (!name || !email || !password || !organization) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: name, email, password, and organization",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const [existingUser, existingOrganizer] = await Promise.all([
      User.findOne({ $or: [{ email }, { name }] }),
      Organizer.findOne({ $or: [{ email }, { name }] }),
    ]);

    if (existingUser || existingOrganizer) {
      return res.status(409).json({
        success: false,
        message: "User or organizer already exists with that email or name",
      });
    }

    const organizerData = {
      name,
      email,
      password,
      organization,
      verified: false, // Set verified to false by default
      status: "pending", // Set status to pending
      ...(phone && { phone }),
    };

    const organizer = await Organizer.create(organizerData);

    // Don't create token on registration - user needs to be verified first
    res.status(201).json({
      success: true,
      message:
        "Registration successful! Your account is pending approval. You will be notified once verified.",
      organizer: {
        id: organizer._id,
        name,
        email,
        organization,
        verified: false,
        status: "pending",
        ...(phone && { phone }),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

export const loginOrganizer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const organizer = await Organizer.findOne({ email });

    if (!organizer) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordCorrect = await organizer.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if organizer is verified
    if (!organizer.verified) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is pending approval. Please wait for admin verification.",
        verified: false,
        status: organizer.status || "pending",
      });
    }

    const token = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        verified: organizer.verified,
        status: organizer.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// Details Management Functions
export const getOrganizerDetails = async (req, res) => {
  try {
    const organizerId = req.params.organizerId || req.params.id;

    if (!organizerId) {
      return res.status(400).json({
        success: false,
        message: "Organizer ID is required",
      });
    }

    const isOwner =
      req.organizer && req.organizer._id.toString() === organizerId;

    const details = await OrganizerDetails.findOne({
      organizer: organizerId,
    });

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Organizer details not found",
      });
    }

    if (!isOwner && details.isPrivate) {
      const publicDetails = {
        name: details.name,
        title: details.title,
        company: details.company,
      };
      return res.json({
        success: true,
        data: publicDetails,
      });
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Error fetching organizer details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve organizer details",
    });
  }
};

export const createOrganizerDetails = async (req, res) => {
  try {
    const organizerId = req.params.id || req.organizer?._id;
    const organizerDetails = req.body;

    console.log("Creating organizer details for ID:", organizerId);

    if (!organizerId) {
      return res.status(400).json({
        success: false,
        message: "Organizer ID is required",
      });
    }

    const organizer = await Organizer.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer not found",
      });
    }

    const requestUserId = req.organizer?._id?.toString();
    if (requestUserId !== organizerId) {
      return res.status(403).json({
        success: false,
        message: "Access denied - you can only update your own profile",
      });
    }

    if (
      !organizerDetails.title ||
      !organizerDetails.bio ||
      !organizerDetails.location
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, bio, and location are required fields",
      });
    }

    // Process arrays if they come as strings
    const processedDetails = { ...organizerDetails };

    if (
      processedDetails.expertise &&
      typeof processedDetails.expertise === "string"
    ) {
      processedDetails.expertise = processedDetails.expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (
      processedDetails.certifications &&
      typeof processedDetails.certifications === "string"
    ) {
      processedDetails.certifications = processedDetails.certifications
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const existingDetails = await OrganizerDetails.findOne({
      organizer: organizerId,
    });

    let result;

    if (existingDetails) {
      result = await OrganizerDetails.findOneAndUpdate(
        { organizer: organizerId },
        processedDetails,
        { new: true, runValidators: true }
      );
    } else {
      const newDetails = new OrganizerDetails({
        ...processedDetails,
        organizer: organizerId,
      });
      result = await newDetails.save();
    }

    await Organizer.findByIdAndUpdate(organizerId, {
      profileComplete: true,
    });

    return res.status(200).json({
      success: true,
      message: "Organizer details saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating/updating organizer details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create/update organizer details",
      error: error.message,
    });
  }
};

export const updateOrganizerDetails = async (req, res) => {
  try {
    const organizerId = req.params.organizerId || req.params.id;
    const updatedDetails = req.body;

    const requestUserId =
      req.organizer?._id?.toString() || req.user?._id?.toString();
    if (requestUserId !== organizerId && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (updatedDetails.tags && typeof updatedDetails.tags === "string") {
      updatedDetails.tags = updatedDetails.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    const result = await OrganizerDetails.findOneAndUpdate(
      { organizer: organizerId },
      updatedDetails,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Organizer details not found",
      });
    }

    await Organizer.findByIdAndUpdate(organizerId, {
      profileComplete: true,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error updating organizer details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update organizer details",
      error: error.message,
    });
  }
};

// Event Management Functions
export const createEvent = async (req, res) => {
  try {
    console.log("Creating event with data:", req.body);

    if (!req.organizer?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - valid organizer account required",
      });
    }

    const event = await Event.create({
      ...req.body,
      organizer: req.organizer._id,
    });

    console.log("Event created successfully:", event._id);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Event creation failed",
    });
  }
};

export const getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.organizer._id });
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEventAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;

    const analytics = await Event.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(eventId),
          organizer: req.organizer._id,
        },
      },
      {
        $lookup: {
          from: "tickets",
          localField: "_id",
          foreignField: "event",
          as: "tickets",
        },
      },
      {
        $project: {
          totalAttendees: { $size: "$tickets" },
          revenue: { $sum: "$tickets.price" },
          checkInRate: {
            $multiply: [
              {
                $divide: [
                  {
                    $size: {
                      $filter: {
                        input: "$tickets",
                        as: "ticket",
                        cond: { $eq: ["$$ticket.checkedIn", true] },
                      },
                    },
                  },
                  { $size: "$tickets" },
                ],
              },
              100,
            ],
          },
        },
      },
    ]).allowDiskUse(true);

    if (!analytics[0]) {
      throw new AppError("Event not found", 404);
    }

    res.json({
      success: true,
      data: analytics[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await Event.aggregate([
      { $match: { organizer: req.organizer._id } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalEvents: { $sum: 1 },
                upcomingEvents: {
                  $sum: {
                    $cond: [{ $gt: ["$startDate", new Date()] }, 1, 0],
                  },
                },
                totalRevenue: { $sum: "$revenue" },
              },
            },
          ],
          recentEvents: [
            { $sort: { startDate: -1 } },
            { $limit: 5 },
            {
              $project: {
                title: 1,
                startDate: 1,
                attendeeCount: 1,
              },
            },
          ],
        },
      },
    ]).allowDiskUse(true);

    const dashboardStats = {
      ...stats[0].summary[0],
      recentEvents: stats[0].recentEvents,
    };

    res.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Export the const functions

// Alias for backward compatibility
export const getMe = getProfile;

// Default export for backward compatibility
const organizerController = {
  register: registerOrganizer,
  login: loginOrganizer,
  createEvent,
  getOrganizerEvents,
  getEventAnalytics,
  getDashboardStats,
  getOrganizerDetails,
  createOrganizerDetails,
  updateOrganizerDetails,
  getProfile,
  getOrganizerProfile,
  getAllOrganizers,
  updateOrganizerProfile,
  getMe,
};

export default organizerController;
