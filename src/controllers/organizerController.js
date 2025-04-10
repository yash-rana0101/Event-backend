import Organizer from "../models/organizerModel.js";
import Event from "../models/Event.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";

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

  // Event Management
  async createEvent(req, res) {
    try {
      const event = await Event.create({
        ...req.body,
        organizer: req.organizer._id,
      });
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: error.message });
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

  // Add the getProfile function to the controller
  getProfile,

  // Use the same function for getMe endpoint
  getMe: getProfile, // Reference the function directly instead of using this
};

export default organizerController;
