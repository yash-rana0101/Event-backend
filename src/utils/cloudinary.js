import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(`name`, process.env.CLOUDINARY_CLOUD_NAME);
console.log(`key`, process.env.CLOUDINARY_API_KEY);
console.log(`secret`, process.env.CLOUDINARY_API_SECRET);


const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const uploadResult = await cloudinary.uploader
      .upload(localFilePath, {
        resource_type: "auto",
      })

      fs.unlinkSync(localFilePath); // remove the locally saved temp file as the operation got failed
    // console.log("File is uploaded on Cloudinary : ", uploadResult.url);
    console.log("upload on cloudinary ",uploadResult);
    return uploadResult;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temp file as the operation got failed
  }
};


export default uploadOnCloudinary;
