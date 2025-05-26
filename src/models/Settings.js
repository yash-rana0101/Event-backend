import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Profile settings
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    avatar: { type: String, default: null },
    bio: { type: String, default: "" },
    timezone: { type: String, default: "UTC-8" },
    language: { type: String, default: "English" },

    // Security settings
    twoFactorEnabled: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 30 },

    // Notification settings
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    newUserRegistration: { type: Boolean, default: true },
    newEventCreated: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },

    // System settings (stored as env-like values)
    siteName: { type: String, default: "Event Management System" },
    siteDescription: {
      type: String,
      default:
        "Professional event management platform for organizers and attendees",
    },
    dateFormat: { type: String, default: "MM/DD/YYYY" },
    currency: { type: String, default: "USD" },
    maintenanceMode: { type: Boolean, default: false },
    debugMode: { type: Boolean, default: false },
    analyticsEnabled: { type: Boolean, default: true },
    cacheEnabled: { type: Boolean, default: true },

    // Appearance settings
    primaryColor: { type: String, default: "#06b6d4" },
    secondaryColor: { type: String, default: "#8b5cf6" },
    accentColor: { type: String, default: "#f59e0b" },
    darkMode: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },
    animationsEnabled: { type: Boolean, default: true },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    customCss: { type: String, default: "" },

    // API settings
    apiKey: {
      type: String,
      default: function () {
        return (
          "api_key_" +
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15)
        );
      },
    },
    webhookUrl: { type: String, default: "" },
    rateLimit: { type: Number, default: 1000 },
    apiVersion: { type: String, default: "v1" },
    enableCors: { type: Boolean, default: true },
    enableLogging: { type: Boolean, default: true },

    // Backup settings
    autoBackup: { type: Boolean, default: false },
    backupFrequency: { type: String, default: "daily" },
    retentionPeriod: { type: Number, default: 30 },
    cloudProvider: { type: String, default: "aws" },
    lastBackup: { type: Date, default: null },
    backupSize: { type: String, default: "0 GB" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Settings", settingsSchema);
