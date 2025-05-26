import { object, string, boolean, number } from "joi";

const profileDataSchema = object({
  firstName: string().min(1).max(50),
  lastName: string().min(1).max(50),
  email: string().email(),
  phone: string().pattern(/^\+?[1-9]\d{1,14}$/),
  bio: string().max(500),
  timezone: string(),
  language: string(),
});

const securitySettingsSchema = object({
  currentPassword: string().min(6),
  newPassword: string().min(6),
  confirmPassword: string().min(6),
  twoFactorEnabled: boolean(),
  loginAlerts: boolean(),
  sessionTimeout: number().min(5).max(480),
});

const notificationSettingsSchema = object({
  emailNotifications: boolean(),
  smsNotifications: boolean(),
  pushNotifications: boolean(),
  newUserRegistration: boolean(),
  newEventCreated: boolean(),
  paymentReceived: boolean(),
  systemAlerts: boolean(),
  marketingEmails: boolean(),
});

const systemSettingsSchema = object({
  siteName: string().min(1).max(100),
  siteDescription: string().max(500),
  timezone: string(),
  dateFormat: string().valid("MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"),
  currency: string().valid("USD", "EUR", "GBP", "CAD"),
  language: string(),
  maintenanceMode: boolean(),
  debugMode: boolean(),
  analyticsEnabled: boolean(),
  cacheEnabled: boolean(),
});

const appearanceSettingsSchema = object({
  primaryColor: string().pattern(/^#[0-9A-F]{6}$/i),
  secondaryColor: string().pattern(/^#[0-9A-F]{6}$/i),
  accentColor: string().pattern(/^#[0-9A-F]{6}$/i),
  darkMode: boolean(),
  compactMode: boolean(),
  animationsEnabled: boolean(),
  logoUrl: string().uri().allow(""),
  faviconUrl: string().uri().allow(""),
  customCss: string().allow(""),
});

const apiSettingsSchema = object({
  webhookUrl: string().uri(),
  rateLimit: number().min(100).max(10000),
  apiVersion: string().valid("v1", "v2", "v3"),
  enableCors: boolean(),
  enableLogging: boolean(),
});

const backupSettingsSchema = object({
  autoBackup: boolean(),
  backupFrequency: string().valid("hourly", "daily", "weekly", "monthly"),
  retentionPeriod: number().min(1).max(365),
  cloudProvider: string().valid("aws", "gcp", "azure", "local"),
});

const validateSettings = (section, data) => {
  const schemas = {
    profileData: profileDataSchema,
    securitySettings: securitySettingsSchema,
    notificationSettings: notificationSettingsSchema,
    systemSettings: systemSettingsSchema,
    appearanceSettings: appearanceSettingsSchema,
    apiSettings: apiSettingsSchema,
    backupSettings: backupSettingsSchema,
  };

  const schema = schemas[section];
  if (!schema) {
    throw new Error("Invalid settings section");
  }

  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }

  return value;
};

export default { validateSettings };
