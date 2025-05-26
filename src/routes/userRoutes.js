import { Router } from "express";
import { validate } from "../middlewares/validationMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/config.js";
// Import new controller functions
import {
  checkCredentials,
  createUserWithHashedPassword,
} from "../controllers/userController.js";
import organizerModel from "../models/organizerModel.js";

const router = Router();

// Public routes

router.get("/test", (req, res) => {
  res.send("Cute");
});

router.post("/register", validate("register"), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email }],
    });
    let existingOrganizer = await organizerModel.findOne({
      $or: [{ email }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with that email as a user",
      });
    }

    if (existingOrganizer) {
      return res.status(409).json({
        success: false,
        message: "User already exists with that email as an organizer",
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      role: "user",
      phone: phone || "",
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      config.jwtSecret,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
});

// Replace your existing login route with this improved version

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const organizer = await organizerModel
      .findOne({ email })
      .select("+password");

    if (organizer) {
      const token = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return res.status(200).json({
        token,
        organizer: {
          id: organizer._id,
          name: organizer.name,
          email,
        },
      });
    }
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.password) {
      console.error("User has no password stored in database");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token with longer expiration (7 days)
    const jwtSecret = config.jwtSecret || process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured properly");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
      expiresIn: config.jwtExpiresIn || "7d", // Changed from 1d to 7d
    });

    // Return user data and token
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
});

// Add a debug endpoint to check credentials (REMOVE IN PRODUCTION)
router.post("/debug-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.json({ exists: false, message: "User not found" });
    }

    // Check password without revealing actual hash
    const passwordMatch = await bcrypt.compare(password, user.password);

    res.json({
      exists: true,
      passwordMatch,
      userDetails: {
        id: user._id,
        email: user.email,
        name: user.name,
        passwordLength: user.password.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add debugging endpoints
router.post("/check-credentials", checkCredentials);
router.post("/create-with-hashed-password", createUserWithHashedPassword);

// Protected routes
router.use(authMiddleware);

router.get("/profile", async (req, res) => {
  try {
    // User ID comes from auth middleware
    const userId = req.user.id;

    // Find user without returning the password
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the profile",
    });
  }
});

router.put("/profile", validate("updateProfile"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, bio } = req.body;

    // Check if updating email or username that already exists
    if (email || username) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: userId } },
          {
            $or: [
              ...(email ? [{ email }] : []),
              ...(username ? [{ username }] : []),
            ],
          },
        ],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username or email already in use",
        });
      }
    }

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { ...req.body } },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the profile",
    });
  }
});

export default router;
