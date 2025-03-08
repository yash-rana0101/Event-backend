import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Import as a function

const router = Router();

// Public team routes
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Get list of public teams
    res.json({ teams: [] });
  })
);

// Protected routes - make sure to import authMiddleware as a function
router.use(authMiddleware); // This should be a function, not an object

// Team management
router.post(
  "/",
  validate("team"),
  asyncHandler(async (req, res) => {
    // Create a new team
    res.status(201).json({ message: "Team created", team: {} });
  })
);

router.get(
  "/my-teams",
  asyncHandler(async (req, res) => {
    // Get user's teams
    res.json({ teams: [] });
  })
);

router.get(
  "/:teamId",
  asyncHandler(async (req, res) => {
    // Get specific team details
    res.json({ team: {} });
  })
);

router.put(
  "/:teamId",
  validate("updateTeam"),
  asyncHandler(async (req, res) => {
    // Update team
    res.json({ message: "Team updated", team: {} });
  })
);

router.delete(
  "/:teamId",
  asyncHandler(async (req, res) => {
    // Delete team
    res.json({ message: "Team deleted" });
  })
);

export default router;
