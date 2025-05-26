import fs from "fs";
import path from "path";

export const setupDirectories = () => {
  const directories = ["uploads", "uploads/avatars", "uploads/backups"];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};
