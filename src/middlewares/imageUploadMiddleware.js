import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Create upload directories if they don't exist
const createTempUploadDir = () => {
  const uploadDir = path.join(process.cwd(), "uploads", "temp");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const uploadDir = createTempUploadDir();

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const fileExt = path.extname(file.originalname);
    cb(null, `event-${uniqueSuffix}${fileExt}`);
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Accepted image types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image files (JPEG, PNG, GIF, WEBP) are allowed!"),
      false
    );
  }
};

// Create multer instance for single image upload
const uploadSingleImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single("image");

// Middleware to handle image upload
export const eventImageUpload = (req, res, next) => {
  uploadSingleImage(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A multer error occurred when uploading
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // If no file was uploaded, still proceed (file isn't required)
    next();
  });
};

export default eventImageUpload;
