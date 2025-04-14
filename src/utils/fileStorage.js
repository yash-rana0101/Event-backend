import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload file to local storage
 * @param {Object} file - The file object (from multer or buffer)
 * @param {string} folder - Subfolder to store the file in
 * @returns {Promise<string>} - URL path to the uploaded file
 */
export const uploadFileToStorage = async (file, folder = "uploads") => {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create folder if it doesn't exist
    const folderPath = path.join(uploadsDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // If file is from multer, it's already saved
    if (file.path) {
      // Move file to appropriate folder
      const filename = path.basename(file.path);
      const newFilePath = path.join(folderPath, filename);

      if (file.path !== newFilePath) {
        fs.renameSync(file.path, newFilePath);
      }

      // Return relative URL path
      return `/uploads/${folder}/${filename}`;
    } else {
      // Handle buffer data if not using multer
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || "image.jpg")}`;
      const filePath = path.join(folderPath, filename);

      await fs.promises.writeFile(filePath, file.buffer || file);

      // Return relative URL path
      return `/uploads/${folder}/${filename}`;
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed");
  }
};

/**
 * Delete file from storage
 * @param {string} fileUrl - URL path of the file to delete
 * @returns {Promise<boolean>} - True if deletion successful, false otherwise
 */
export const deleteFileFromStorage = async (fileUrl) => {
  try {
    // Skip if fileUrl is not provided
    if (!fileUrl) return false;

    // Convert URL to file path
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      fileUrl.replace(/^\//, "") // Remove leading slash if present
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found for deletion: ${filePath}`);
      return false;
    }

    // Delete the file
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

/**
 * Get full server path for a file URL
 * @param {string} fileUrl - URL path of the file
 * @returns {string} - Full server path
 */
export const getFullFilePath = (fileUrl) => {
  if (!fileUrl) return null;

  return path.join(
    __dirname,
    "..",
    "..",
    fileUrl.replace(/^\//, "") // Remove leading slash if present
  );
};

export default {
  uploadFileToStorage,
  deleteFileFromStorage,
  getFullFilePath,
};
