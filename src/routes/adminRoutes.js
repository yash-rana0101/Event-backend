import express from "express";
import { userOrAdminMiddleware } from "../middlewares/authMiddleware.js";
import {getDashboardOverview,getAllUsers,updateUserStatus,getAllOrganizers,approveOrganizer,deleteOrganizer,getAllEventsAdmin,approveEvent,deleteEventAdmin,getAnalytics,getSystemConfig,updateSystemConfig,getOrganizerStats,getOrganizerById,updateOrganizerStatus,} from "../controllers/adminController.js";

const router = express.Router();

// Apply admin middleware to all routes
router.use(userOrAdminMiddleware);

// Dashboard routes
router.get("/dashboard", getDashboardOverview);
router.get("/analytics", getAnalytics);

// User management routes
router.get("/users", getAllUsers);
router.put("/users/:userId/status", updateUserStatus);

// Organizer management routes
router.get("/organizers", getAllOrganizers);
router.put("/organizers/:organizerId/approve", approveOrganizer);
router.delete("/organizers/:organizerId", deleteOrganizer);

// Event management routes
router.get("/events", getAllEventsAdmin);
router.put("/events/:eventId/approve", approveEvent);
router.delete("/events/:eventId", deleteEventAdmin);

// System configuration routes
router.get("/config", getSystemConfig);
router.put("/config", updateSystemConfig);

// Get organizer statistics
router.get("/organizers/stats", getOrganizerStats);

// Get specific organizer details
router.get("/organizers/:id", getOrganizerById);

// Update organizer status (approve, reject, suspend, block)
router.patch("/organizers/:id/status", updateOrganizerStatus);

// Delete organizer
router.delete("/organizers/:id", deleteOrganizer);

export default router;
