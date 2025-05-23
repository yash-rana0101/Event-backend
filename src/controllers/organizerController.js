import Organizer from "../models/organizerModel.js";
import Event from "../models/Event.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import OrganizerDetails from "../models/organizerDetailsModel.js";

// First, define the getProfile function separately so we can reuse it
const getProfile = async (req, res) => {
  try {
    const organizer = req.organizer || req.user;

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Remove sensitive data before sending
    const { password, ...organizerData } = organizer._doc || organizer;

    res.status(200).json(organizerData);
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    res.status(500).json({ message: "Failed to retrieve profile" });
  }
};

// Extract the getOrganizerProfile function to be exported separately
export const getOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.params.id;

    // Fetch organizer details
    const organizer = await Organizer.findById(organizerId).select("-password");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Fetch events organized by the organizer
    const events = await Event.find({ organizer: organizerId }).select(
      "name date location attendees category status description highlights"
    );

    // Mock testimonials and certifications (replace with actual data if available)
    const testimonials = [
      {
        name: "Sarah Johnson",
        position: "CMO, TechGiant Inc.",
        comment:
          "Alex organized our company conference flawlessly. The attention to detail and creative elements made it our best event yet.",
        rating: 5,
      },
      {
        name: "Michael Chen",
        position: "Founder, Startup Ventures",
        comment:
          "Working with Alex was the best decision we made for our product launch. Professional, creative, and delivers beyond expectations.",
        rating: 5,
      },
    ];

    const certifications = [
      "Certified Meeting Professional (CMP)",
      "Digital Event Strategist (DES)",
    ];

    res.status(200).json({
      organizer,
      events,
      testimonials,
      certifications,
    });
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    res.status(500).json({ message: "Failed to retrieve organizer profile" });
  }
};

// Also export updateOrganizerProfile which is likely needed
export const updateOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const updateData = req.body;

    // Check if organizer exists
    const organizer = await Organizer.findById(organizerId);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Check if the requesting user has permission to update
    if (req.organizer._id.toString() !== organizerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    // Update organizer info
    const updatedOrganizer = await Organizer.findByIdAndUpdate(
      organizerId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      organizer: updatedOrganizer,
    });
  } catch (error) {
    console.error("Error updating organizer profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Define the controller object
const organizerController = {
  async register(req, res) {
    try {
      const { name, email, password, organization } = req.body;

      let existingUser = await User.findOne({
        $or: [{ email }, { name }],
      });
      let existingOrganizer = await Organizer.findOne({
        $or: [{ email }, { name }],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with that email or name",
        });
      }

      if (existingOrganizer) {
        return res.status(409).json({
          success: false,
          message: "User already exists with that email or name",
        });
      }

      const organizer = await Organizer.create({
        name,
        email,
        password,
        organization,
      });

      const token = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({
        token,
        organizer: {
          id: organizer._id,
          name,
          email,
          organization,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Add login function
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide email and password",
        });
      }

      // Find the organizer by email
      const organizer = await Organizer.findOne({ email });

      if (!organizer) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if password is correct
      const isPasswordCorrect = await organizer.comparePassword(password);

      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate token with longer expiration (7 days)
      const token = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Return success with token and organizer data
      res.status(200).json({
        success: true,
        token,
        user: {
          id: organizer._id,
          name: organizer.name,
          email: organizer.email,
          organization: organizer.organization,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  },

  // Event Management
  async createEvent(req, res) {
    try {
      // Log the received data
      console.log("Creating event with data:", req.body);
      console.log("Organizer ID:", req.organizer._id);

      // Make sure we have a valid organizer
      if (!req.organizer || !req.organizer._id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - valid organizer account required",
        });
      }

      // Create the event with the organizer's ID
      const event = await Event.create({
        ...req.body,
        organizer: req.organizer._id,
      });

      console.log("Event created successfully:", event._id);

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        event,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Event creation failed",
      });
    }
  },

  async getOrganizerEvents(req, res) {
    try {
      const events = await Event.find({ organizer: req.organizer._id });
      res.json(events);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async getEventAnalytics(req, res) {
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

      res.json(analytics[0]);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getDashboardStats(req, res) {
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

      res.json(dashboardStats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getOrganizerDetails(req, res) {
    try {
      const { organizerId } = req.params;

      if (!organizerId) {
        return res.status(400).json({ message: "Organizer ID is required" });
      }

      // Check if user has permission (if not the owner, verify if details are public)
      const isOwner =
        req.organizer && req.organizer._id.toString() === organizerId;

      // Find the organizer's details
      const details = await OrganizerDetails.findOne({
        organizer: organizerId,
      });

      if (!details) {
        return res.status(404).json({ message: "Organizer details not found" });
      }

      // If not the owner and details are private, return limited information
      if (!isOwner && details.isPrivate) {
        // Return only public fields
        const publicDetails = {
          name: details.name,
          title: details.title,
          company: details.company,
          // Add other fields you want to make public
        };
        return res.json(publicDetails);
      }

      // Return full details
      res.json(details);
    } catch (error) {
      console.error("Error fetching organizer details:", error);
      res.status(500).json({ message: "Failed to retrieve organizer details" });
    }
  },

  async createOrganizerDetails(req, res) {
    try {
      const { organizerId } = req.params;
      const organizerDetails = req.body;

      // Validate that the organizer exists
      const organizer = await Organizer.findById(organizerId);
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      // Check permissions - only the organizer themself or an admin can update
      const requestUserId =
        req.organizer?._id?.toString() || req.user?._id?.toString();
      if (requestUserId !== organizerId && req.user?.role !== "admin") {
        return res.status(403).json({
          message: "Access denied - you can only update your own profile",
          requestUserId,
          organizerId,
        });
      }

      // Find existing details
      let existingDetails = await OrganizerDetails.findOne({
        organizer: organizerId,
      });

      // For updated tags, ensure it's an array
      if (organizerDetails.tags && typeof organizerDetails.tags === "string") {
        organizerDetails.tags = organizerDetails.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      // Create or update
      let result;

      if (existingDetails) {
        // Update existing details
        result = await OrganizerDetails.findOneAndUpdate(
          { organizer: organizerId },
          organizerDetails,
          { new: true, runValidators: true }
        );
      } else {
        // Create new details
        const newDetails = new OrganizerDetails({
          ...organizerDetails,
          organizer: organizerId,
        });
        result = await newDetails.save();
      }

      // Set flag on the organizer model that details are complete
      await Organizer.findByIdAndUpdate(organizerId, {
        profileComplete: true,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error creating/updating organizer details:", error);
      return res.status(500).json({
        message: "Failed to create/update organizer details",
        error: error.message,
      });
    }
  },

  async updateOrganizerDetails(req, res) {
    try {
      const { organizerId } = req.params;
      const updatedDetails = req.body;

      // Permission check
      const requestUserId =
        req.organizer?._id?.toString() || req.user?._id?.toString();
      if (requestUserId !== organizerId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Parse tags if provided as string
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
        return res.status(404).json({ message: "Organizer details not found" });
      }

      // Set flag on the organizer model that details are complete
      await Organizer.findByIdAndUpdate(organizerId, {
        profileComplete: true,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error updating organizer details:", error);
      return res.status(500).json({
        message: "Failed to update organizer details",
        error: error.message,
      });
    }
  },

  // Add the getProfile function to the controller
  getProfile,

  // Use the same function for getMe endpoint
  getMe: getProfile, // Reference the function directly instead of using this
};

// Export the registerOrganizer and loginOrganizer functions
export const registerOrganizer = organizerController.register;
export const loginOrganizer = organizerController.login;

export default organizerController;
