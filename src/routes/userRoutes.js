import { Router } from "express";
import { loginLimiter } from "../middlewares/securityMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/config.js";

const router = Router();

// Public routes
router.post("/register", validate("register"), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with that email or username",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: "user",
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
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
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

router.post("/login", loginLimiter, validate("login"), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
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
    });
  }
});

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
