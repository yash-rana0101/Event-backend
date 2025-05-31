import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import {
  verifyGoogleToken,
  generateAuthUrl,
  getTokenFromCode,
} from "../utils/googleAuth.js";

// Google OAuth login/register
export const googleAuth = async (req, res) => {
  try {
    const { token, code } = req.body;
    let googleData;

    if (token) {
      // Handle ID token from frontend
      const verificationResult = await verifyGoogleToken(token);
      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google token",
        });
      }
      googleData = verificationResult.data;
    } else if (code) {
      // Handle authorization code
      const tokenResult = await getTokenFromCode(code);
      if (!tokenResult.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to exchange code for token",
        });
      }

      // Verify the ID token
      const verificationResult = await verifyGoogleToken(
        tokenResult.tokens.id_token
      );
      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google token",
        });
      }
      googleData = verificationResult.data;
    } else {
      return res.status(400).json({
        success: false,
        message: "No Google token or code provided",
      });
    }

    const { googleId, email, name, picture, emailVerified } = googleData;

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email: email }, { googleId: googleId }],
    });

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.emailVerified = emailVerified;
        if (picture && !user.avatar) {
          user.avatar = picture;
        }
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        avatar: picture,
        emailVerified,
        role: "user",
        // No password required for Google users
      });
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: user.googleId
        ? "Login successful"
        : "Account created and logged in",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isAdmin: user.role === "admin",
      },
      token: jwtToken,
      tokenExpiry: tokenExpiry.toISOString(),
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

// Get Google auth URL
export const getGoogleAuthUrl = async (req, res) => {
  try {
    const authUrl = generateAuthUrl();
    res.status(200).json({
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
};

// Handle Google OAuth callback
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no_code`);
    }

    const tokenResult = await getTokenFromCode(code);
    if (!tokenResult.success) {
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/login?error=token_exchange_failed`
      );
    }

    const verificationResult = await verifyGoogleToken(
      tokenResult.tokens.id_token
    );
    if (!verificationResult.success) {
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/login?error=verification_failed`
      );
    }

    const { googleId, email, name, picture, emailVerified } =
      verificationResult.data;

    // Find or create user
    let user = await User.findOne({
      $or: [{ email: email }, { googleId: googleId }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.emailVerified = emailVerified;
        if (picture && !user.avatar) {
          user.avatar = picture;
        }
        await user.save();
      }
    } else {
      user = new User({
        name,
        email,
        googleId,
        avatar: picture,
        emailVerified,
        role: "user",
      });
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    res.redirect(
      `${
        process.env.CLIENT_URL
      }/auth/google/success?token=${jwtToken}&user=${encodeURIComponent(
        JSON.stringify({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        })
      )}`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=callback_failed`);
  }
};
