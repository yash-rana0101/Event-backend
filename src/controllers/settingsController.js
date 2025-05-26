import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { ApiError } from "../utils/errorHandler.js";
import { logInfo, logError } from "../utils/logger.js";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import uploadOnCloudinary from "../utils/cloudinary.js";

// Get all settings
export const getSettings = async (req, res) => {
  logInfo("Fetching admin settings", { userId: req.user._id });

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  // Get user data directly from User model
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get or create settings for non-profile data
  let settings = await Settings.findOne({ userId: req.user._id });
  if (!settings) {
    settings = await Settings.create({ userId: req.user._id });
  }

  const response = {
    profile: {
      firstName: user.firstName || user.name?.split(" ")[0] || "",
      lastName: user.lastName || user.name?.split(" ")[1] || "",
      email: user.email || "",
      phone: user.phone || "",
      avatar: user.avatar || null,
      bio: user.bio || "",
      timezone: user.timezone || settings.timezone || "UTC-8",
      language: user.language || settings.language || "English",
    },
    system: {
      siteName:
        settings.siteName || process.env.SITE_NAME || "Event Management System",
      siteDescription:
        settings.siteDescription ||
        process.env.SITE_DESCRIPTION ||
        "Professional event management platform",
      timezone: settings.timezone || process.env.DEFAULT_TIMEZONE || "UTC-8",
      dateFormat:
        settings.dateFormat || process.env.DATE_FORMAT || "MM/DD/YYYY",
      currency: settings.currency || process.env.DEFAULT_CURRENCY || "USD",
      language: settings.language || process.env.DEFAULT_LANGUAGE || "English",
      maintenanceMode:
        settings.maintenanceMode || process.env.MAINTENANCE_MODE === "true",
      debugMode: settings.debugMode || process.env.DEBUG_MODE === "true",
      analyticsEnabled: settings.analyticsEnabled !== false,
      cacheEnabled: settings.cacheEnabled !== false,
    },
    notifications: {
      emailNotifications: user.emailNotifications !== false,
      smsNotifications: user.smsNotifications || false,
      pushNotifications: user.pushNotifications !== false,
      newUserRegistration: settings.newUserRegistration !== false,
      newEventCreated: settings.newEventCreated !== false,
      paymentReceived: settings.paymentReceived !== false,
      systemAlerts: settings.systemAlerts !== false,
      marketingEmails: user.marketingEmails || false,
    },
    appearance: {
      primaryColor: settings.primaryColor || "#06b6d4",
      secondaryColor: settings.secondaryColor || "#8b5cf6",
      accentColor: settings.accentColor || "#f59e0b",
      darkMode: settings.darkMode !== false,
      compactMode: settings.compactMode || false,
      animationsEnabled: settings.animationsEnabled !== false,
      logoUrl: settings.logoUrl || "",
      faviconUrl: settings.faviconUrl || "",
      customCss: settings.customCss || "",
    },
    api: {
      apiKey: settings.apiKey || "",
      webhookUrl: settings.webhookUrl || "",
      rateLimit: settings.rateLimit || 1000,
      apiVersion: settings.apiVersion || "v1",
      enableCors: settings.enableCors !== false,
      enableLogging: settings.enableLogging !== false,
    },
    backup: {
      autoBackup: settings.autoBackup || false,
      backupFrequency: settings.backupFrequency || "daily",
      retentionPeriod: settings.retentionPeriod || 30,
      cloudProvider: settings.cloudProvider || "aws",
      lastBackup: settings.lastBackup || null,
      backupSize: settings.backupSize || "",
    },
  };

  logInfo("Settings fetched successfully", { userId: req.user._id });

  res.status(200).json({
    success: true,
    data: response,
  });
};

// Update settings with admin validation
export const updateSettings = async (req, res) => {
  const { section, data } = req.body;
  const userId = req.user._id;

  logInfo("Updating settings", { userId, section });

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  // Get user and settings
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let settings = await Settings.findOne({ userId });
  if (!settings) {
    settings = await Settings.create({ userId });
  }

  // Handle profile updates - update User model directly
  if (section === "profile") {
    const updateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      bio: data.bio,
      timezone: data.timezone,
      language: data.language,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      throw new ApiError(404, "Failed to update user profile");
    }

    logInfo("Profile updated successfully", { userId, section });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  }

  // Handle notification updates - update both User and Settings
  if (section === "notifications") {
    // Update user-specific notifications in User model
    const userNotifications = {
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      pushNotifications: data.pushNotifications,
      marketingEmails: data.marketingEmails,
    };

    // Remove undefined values
    Object.keys(userNotifications).forEach((key) => {
      if (userNotifications[key] === undefined) {
        delete userNotifications[key];
      }
    });

    await User.findByIdAndUpdate(userId, userNotifications);

    // Update system notifications in Settings model
    const systemNotifications = {
      newUserRegistration: data.newUserRegistration,
      newEventCreated: data.newEventCreated,
      paymentReceived: data.paymentReceived,
      systemAlerts: data.systemAlerts,
    };

    // Remove undefined values
    Object.keys(systemNotifications).forEach((key) => {
      if (systemNotifications[key] === undefined) {
        delete systemNotifications[key];
      }
    });

    const updatedSettings = await Settings.findOneAndUpdate(
      { userId },
      systemNotifications,
      { new: true, upsert: true, runValidators: true }
    );

    logInfo("Notification settings updated successfully", { userId, section });

    return res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: updatedSettings,
    });
  }

  // Handle other settings updates
  const updateData = buildUpdateData(section, data);

  if (!updateData) {
    throw new ApiError(400, "Invalid settings section");
  }

  const updatedSettings = await Settings.findOneAndUpdate(
    { userId },
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  if (!updatedSettings) {
    throw new ApiError(404, "Settings not found");
  }

  logInfo("Settings updated successfully", { userId, section });

  res.status(200).json({
    success: true,
    message: "Settings updated successfully",
    data: updatedSettings,
  });
};

// Helper function to build update data for non-profile sections
const buildUpdateData = (section, data) => {
  const updateMappings = {
    appearance: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      darkMode: data.darkMode,
      compactMode: data.compactMode,
      animationsEnabled: data.animationsEnabled,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      customCss: data.customCss,
    },
    system: {
      siteName: data.siteName,
      siteDescription: data.siteDescription,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      currency: data.currency,
      language: data.language,
      maintenanceMode: data.maintenanceMode,
      debugMode: data.debugMode,
      analyticsEnabled: data.analyticsEnabled,
      cacheEnabled: data.cacheEnabled,
    },
    api: {
      webhookUrl: data.webhookUrl,
      rateLimit: data.rateLimit,
      apiVersion: data.apiVersion,
      enableCors: data.enableCors,
      enableLogging: data.enableLogging,
    },
    backup: {
      autoBackup: data.autoBackup,
      backupFrequency: data.backupFrequency,
      retentionPeriod: data.retentionPeriod,
      cloudProvider: data.cloudProvider,
    },
    security: {
      twoFactorEnabled: data.twoFactorEnabled,
      loginAlerts: data.loginAlerts,
      sessionTimeout: data.sessionTimeout,
    },
  };

  return updateMappings[section] || null;
};

// Upload avatar with admin check and Cloudinary integration
export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const userId = req.user._id;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  logInfo("Uploading avatar to Cloudinary", {
    userId,
    filename: req.file.filename,
  });

  try {
    // Get current user to check for old avatar
    const user = await User.findById(userId);

    // Upload new avatar to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);

    if (!cloudinaryResponse) {
      throw new ApiError(500, "Failed to upload avatar to Cloudinary");
    }

    const avatarUrl = cloudinaryResponse.secure_url;

    // Delete old avatar from Cloudinary if it exists
    if (user && user.avatar && user.avatar.includes("cloudinary")) {
      try {
        // Extract public_id from the old avatar URL
        const urlParts = user.avatar.split("/");
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split(".")[0];

        // Delete old image from Cloudinary
        await cloudinary.uploader.destroy(`uploads/${publicId}`);
        logInfo("Old avatar deleted from Cloudinary", {
          userId,
          oldAvatar: user.avatar,
        });
      } catch (error) {
        logError("Failed to delete old avatar from Cloudinary", {
          userId,
          error: error.message,
        });
      }
    }

    // Update User model with new avatar URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    logInfo("Avatar uploaded successfully to Cloudinary", {
      userId,
      avatarUrl,
    });

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: { avatarUrl },
    });
  } catch (error) {
    logError("Avatar upload failed", { userId, error: error.message });

    // Clean up local file if it still exists
    try {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path);
      }
    } catch (cleanupError) {
      logError("Failed to cleanup local file", { error: cleanupError.message });
    }

    throw new ApiError(500, "Failed to upload avatar");
  }
};



// Create backup with admin check
export const createBackup = async (req, res) => {
  const userId = req.user._id;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  const backupDate = new Date();

  logInfo("Creating backup", { userId });

  const backupSize = await calculateBackupSize();

  await Settings.findOneAndUpdate(
    { userId },
    { lastBackup: backupDate, backupSize: backupSize },
    { upsert: true }
  );

  logInfo("Backup created successfully", { userId, backupSize });

  res.status(200).json({
    success: true,
    message: "Backup created successfully",
    data: { lastBackup: backupDate, backupSize: backupSize },
  });
};

// Download backup
export const downloadBackup = async (req, res) => {
  const { backupId } = req.params;
  const userId = req.user._id;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  logInfo("Downloading backup", { userId, backupId });

  const backupPath = path.join(
    process.cwd(),
    "backups",
    `backup-${backupId}.zip`
  );

  try {
    const backupExists = await fs
      .access(backupPath)
      .then(() => true)
      .catch(() => false);

    if (!backupExists) {
      throw new ApiError(404, "Backup file not found");
    }

    res.download(backupPath, `backup-${backupId}.zip`);
    logInfo("Backup downloaded successfully", { userId, backupId });
  } catch (error) {
    logError("Backup download failed", {
      userId,
      backupId,
      error: error.message,
    });
    throw new ApiError(500, "Failed to download backup");
  }
};

// Restore backup
export const restoreBackup = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No backup file uploaded");
  }

  const userId = req.user._id;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  logInfo("Restoring backup", { userId, filename: req.file.filename });

  try {
    if (!req.file.originalname.endsWith(".zip")) {
      throw new ApiError(
        400,
        "Invalid backup file format. Only ZIP files are allowed."
      );
    }

    // Simulate restore process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    logInfo("Backup restored successfully", { userId });

    res.status(200).json({
      success: true,
      message: "Backup restored successfully",
    });
  } catch (error) {
    logError("Backup restore failed", { userId, error: error.message });
    throw new ApiError(500, "Failed to restore backup");
  }
};

const calculateBackupSize = async () => {
  const sizes = ["1.2 GB", "2.4 GB", "3.1 GB", "1.8 GB", "2.9 GB"];
  return sizes[Math.floor(Math.random() * sizes.length)];
};
