import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/config.js";

const router = express.Router();

// Get Google OAuth URL
router.get("/google/url", (req, res) => {
  try {
    const baseUrl = "https://accounts.google.com/oauth/authorize";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || config.google.clientId,
      redirect_uri: config.google.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    const authUrl = `${baseUrl}?${params.toString()}`;

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error("Error generating Google auth URL:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate auth URL",
    });
  }
});

// Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.error("Google OAuth error:", error);
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/auth/login?error=oauth_error`
      );
    }

    if (!code) {
      return res.redirect(
        `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/auth/login?error=no_code`
      );
    }

    // For now, redirect to frontend with code to handle token exchange there
    const redirectUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/auth/google/success?code=${code}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/login?error=oauth_callback_error`
    );
  }
});

// Handle token-based Google authentication
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // For now, create a mock user response
    // In production, you would verify the Google token here
    const mockUser = {
      _id: "google_user_" + Date.now(),
      name: "Google User",
      email: "user@gmail.com",
      role: "user",
      profilePicture: null,
    };

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: mockUser._id },
      config.jwtSecret || "fallback_secret",
      { expiresIn: "7d" }
    );

    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      token: jwtToken,
      tokenExpiry: tokenExpiry.toISOString(),
      user: mockUser,
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(401).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
    });
  }
});

export default router;
