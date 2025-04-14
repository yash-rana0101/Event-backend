import multer from "multer";
import path from "path";
import fs from "fs";
// Replace uuid with a fallback option for unique filenames
import crypto from "crypto";

// Create a function to generate unique IDs without depending on uuid
const generateUniqueId = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Create upload directories if they don't exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Base upload directory
const uploadDir = path.join(process.cwd(), "public", "uploads");
createDirIfNotExists(uploadDir);

// Create specific directories for different file types
const eventImagesDir = path.join(uploadDir, "events");
const profileImagesDir = path.join(uploadDir, "profiles");
const tempUploadsDir = path.join(uploadDir, "temp");

createDirIfNotExists(eventImagesDir);
createDirIfNotExists(profileImagesDir);
createDirIfNotExists(tempUploadsDir);

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on route or request
    if (req.path.includes("/events")) {
      cb(null, eventImagesDir);
    } else if (req.path.includes("/profile")) {
      cb(null, profileImagesDir);
    } else {
      cb(null, tempUploadsDir);
    }
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueId = generateUniqueId();
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExt}`);
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Accepted image types
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create the multer upload instance
export const fileUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Export a helper to get file path relative to server URL
export const getFileUrl = (filename, type = "events") => {
  if (!filename) return null;

  // If already a full URL, return as is
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Otherwise construct path relative to upload directory
  return `/uploads/${type}/${path.basename(filename)}`;
};

// Middleware to handle file upload errors more gracefully
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
