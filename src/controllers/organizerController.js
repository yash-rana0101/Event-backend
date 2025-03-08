import Organizer from "../models/organizerModel.js";
import Event from "../models/Event.js";
import jwt from "jsonwebtoken";
import { cache } from "../config/redis.js";
import AppError from "../utils/AppError.js";

const organizerController = {
  async register(req, res) {
    try {
      const { name, email, password, organization } = req.validatedData;

      const existingOrganizer = await Organizer.findOne({ email });
      if (existingOrganizer) {
        throw new AppError("Email already registered", 400);
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

  async login(req, res) {
    try {
      const { email, password } = req.validatedData;

      const organizer = await Organizer.findOne({ email }).select("+password");
      if (!organizer || !(await organizer.comparePassword(password))) {
        throw new AppError("Invalid credentials", 401);
      }

      const token = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        token,
        organizer: {
          id: organizer._id,
          name: organizer.name,
          email,
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
      const cacheKey = `analytics:${eventId}:${req.organizer._id}`;

      // Try to get from cache first
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

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
      ]).allowDiskUse(true); // For large datasets

      if (!analytics[0]) {
        throw new AppError("Event not found", 404);
      }

      // Cache the results for 5 minutes
      await cache.set(cacheKey, analytics[0], 300);

      res.json(analytics[0]);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const cacheKey = `dashboard:${req.organizer._id}`;

      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

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

      // Cache for 15 minutes
      await cache.set(cacheKey, dashboardStats, 900);

      res.json(dashboardStats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default organizerController;
