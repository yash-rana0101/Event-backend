import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  applyToTeam,
  getUserRequests,
  cancelRequest,
  manageTeamRequests,
  respondToRequest,
  leaveTeam,
  getUserTeams,
} from "../controllers/teamController.js";

const router = express.Router();

// Team routes
router.get("/", getAllTeams); // Public
router.get("/:teamId", getTeamById); // Public

// Protected routes
router.post("/", authMiddleware, createTeam);
router.put("/:teamId", authMiddleware, updateTeam);
router.delete("/:teamId", authMiddleware, deleteTeam);

// Team join/leave
router.post("/:teamId/apply", authMiddleware, applyToTeam);
router.delete("/:teamId/leave", authMiddleware, leaveTeam);

// Team requests
router.get("/user/requests", authMiddleware, getUserRequests);
router.delete("/requests/:requestId/cancel", authMiddleware, cancelRequest);

// Team owner-specific
router.get("/:teamId/requests", authMiddleware, manageTeamRequests);
router.put("/requests/:requestId/respond", authMiddleware, respondToRequest);

// User teams
router.get("/user/teams", authMiddleware, getUserTeams);

export default router;
