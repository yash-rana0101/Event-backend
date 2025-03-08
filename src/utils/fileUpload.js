import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import crypto from "crypto";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads",
    format: async (req, file) => {
      const ext = file.mimetype.split("/")[1];
      return ext === "jpeg" ? "jpg" : ext; // Convert jpeg to jpg
    },
    public_id: (req, file) => {
      const uniqueSuffix = crypto.randomBytes(8).toString("hex");
      return `${uniqueSuffix}-${file.originalname}`;
    },
  },
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedFileTypes = {
    "image/jpeg": true,
    "image/jpg": true,
    "image/png": true,
    "application/pdf": true,
    "application/msword": true,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  };

  if (allowedFileTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Allowed types: JPG, PNG, PDF, DOC, DOCX"
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Handle single file upload
 * @param {String} fieldName - Form field name
 */
export const uploadSingle = (fieldName) => (req, res, next) => {
  const uploadMiddleware = upload.single(fieldName);

  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error occurred
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      // Other error occurred
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    // Success
    next();
  });
};

/**
 * Handle multiple file uploads
 * @param {String} fieldName - Form field name
 * @param {Number} maxCount - Maximum number of files
 */
export const uploadMultiple =
  (fieldName, maxCount = 5) =>
  (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer error occurred
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
        });
      } else if (err) {
        // Other error occurred
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      // Success
      next();
    });
  };

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file to delete
 * @returns {Boolean} True if file was deleted successfully
 */
export const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`);
    return false;
  }
};

export default { uploadSingle, uploadMultiple, deleteFile };
